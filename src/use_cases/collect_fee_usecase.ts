import prisma from "../prisma";
import { INSTALLATION_FEE_OF_DAY, TERM_TIME_ZONE } from "../constants";
import dayjs from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { error, info, warn } from "../utils";
import { CollectState, PaymentState, Prisma } from "@prisma/client";
import { IllegalStateUseCaseError } from "./errors";
import {
  notifyAmUninstallBecauseAutoRenewDisabled,
  notifyAmUninstallBecauseStopRenting,
  notifyRentalFeeCollect,
  notifyRentalFeePayment,
} from "../helpers/event_notification";

dayjs.extend(CustomParseFormat);
dayjs.extend(timezone);
dayjs.extend(utc);

export interface CollectFeeUseCase {
  Execute(dateStr: string): Promise<void>;
}

export class CollectFeeUseCaseImpl implements CollectFeeUseCase {
  async Execute(date: string): Promise<void> {
    // yyyyMMdd 00:00:00 JSTのDateインスタンス
    const dateInstance = dayjs(date, "YYYYMMDD").tz(TERM_TIME_ZONE).toDate();

    await this.removeArcadeMachinesWithAutomaticRenewDisabled(dateInstance);
    await this.removeArcadeMachinesInPlacementNotAllowedGameCenters(
      dateInstance,
    );
    const dateStr = await this.insertCollectData(dateInstance);
    await this.collectFees(dateStr);
    await this.payFees(dateStr);
  }

  // 自動更新を設定していないAMを撤去する
  async removeArcadeMachinesWithAutomaticRenewDisabled(
    date: Date,
  ): Promise<void> {
    info("start:remove arcade machines with automatic renew disabled");
    const whereObj = {
      autoRenewLease: false,
      installedAt: {
        lt: date,
      },
    };
    const ret = await prisma.$transaction([
      prisma.arcadeMachine.findMany({
        where: whereObj,
        select: {
          id: true,
          userId: true,
          gameCenter: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      }),
      prisma.arcadeMachine.updateMany({
        where: whereObj,
        data: {
          gameCenterId: null,
          position: null,
        },
      }),
    ]);
    await notifyAmUninstallBecauseAutoRenewDisabled(ret[0]);
    info(`uninstall arcade machine count:${ret[1].count}`);
    info("end:remove arcade machines with automatic renew disabled");
  }

  // 募集中ではないGameCenterに設置されているAMを撤去する
  async removeArcadeMachinesInPlacementNotAllowedGameCenters(
    date: Date,
  ): Promise<void> {
    info("start:remove arcade machines in placement not allowed game centers");
    const whereObj = {
      gameCenter: {
        placementAllowed: false,
      },
      installedAt: {
        lt: date,
      },
    };
    const ret = await prisma.$transaction([
      prisma.arcadeMachine.findMany({
        where: whereObj,
        select: {
          id: true,
          userId: true,
          gameCenter: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      }),
      prisma.arcadeMachine.updateMany({
        where: whereObj,
        data: {
          gameCenterId: null,
          position: null,
        },
      }),
    ]);
    await notifyAmUninstallBecauseStopRenting(ret[0]);
    info(`uninstall arcade machine count:${ret[1].count}`);
    info("end:remove arcade machines in placement not allowed game centers");
  }

  // 処理対象のレコードを投入
  async insertCollectData(date: Date): Promise<string> {
    info("start insert collect data");
    const dateStr = dayjs(date).tz(TERM_TIME_ZONE).format("YYYYMMDD");

    const beforeInsertedRecordsExists = await prisma.rentalFee.count({
      where: { date: dateStr },
    });
    if (beforeInsertedRecordsExists > 0) {
      // すでに当日のレコードが存在しているので処理せずリターンする
      info("collect records exists.not insert.");
      return dateStr;
    }

    const count: number = await prisma.$executeRaw`
        insert into rental_fees (date, arcade_machine_owner_id, arcade_machine_id, game_center_owner_id,
                                       game_center_id, fee)
        select ${dateStr} as date,
               am.user_id as arcade_machine_owner_id,
               am.id      as arcade_machine_id,
               gc.user_id as game_center_owner_id,
               gc.id      as game_center_id,
               ${INSTALLATION_FEE_OF_DAY} --今は固定値なので直接入れる
        from arcade_machines am
                 inner join game_centers gc on am.game_center_id = gc.id
        where gc.placement_allowed = true
          and am.auto_renew_lease = true
          and am.installed_at < ${date}
          and am.user_id <> gc.user_id -- AMOとGCOが同一の場合、料金徴収がないので除外
          and am.user_id IS NOT NULL -- 念のためユーザーが紐づいていないAMは除外
          and gc.user_id IS NOT NULL -- 念のためユーザーが紐づいていないGCは除外
    `;

    info(`inserted record count:${count}`);
    info("end insert collect data");
    return dateStr;
  }

  async collectFees(dateStr: string): Promise<void> {
    // tempテーブルからAMOごとにFeeを集計したレコードを取得
    const rows: any[] = await prisma.$queryRaw`
        select cf.arcade_machine_owner_id     as amoid,
               sum(cf.fee)                    as sum_fees,
               count(arcade_machine_owner_id) as count_records
        from rental_fees cf
        where cf.date = ${dateStr}
          and cf.collect_state = 'UNPROCESSED'
        group by cf.arcade_machine_owner_id
    `;
    info({ msg: `start collect fees. unique AM owner count:[${rows.length}]` });

    for (const row of rows) {
      const owner = await prisma.user.findUniqueOrThrow({
        where: { id: row.amoid },
      });
      let success = false;
      info({
        msg: `AMO:${owner.id} start collect fee. fee amount[${row.sum_fees}]`,
      });

      // AMOのTeras残高>Feeの合計の場合は一括徴収
      if (owner.terasBalance.gte(row.sum_fees)) {
        try {
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: owner.id },
              data: {
                terasBalance: {
                  decrement: row.sum_fees,
                },
              },
            });
            const { count } = await tx.rentalFee.updateMany({
              where: {
                date: dateStr,
                arcadeMachineOwnerId: owner.id,
                collectState: CollectState.UNPROCESSED,
              },
              data: {
                collectState: CollectState.COLLECTED,
                collectDate: new Date(),
              },
            });
            if (BigInt(count) !== row.count_records) {
              throw new IllegalStateUseCaseError(
                `updated count ${count}, but want update records ${row.count_records}`,
              );
            }
          });
          success = true;
          // 賃料が無料の時はNotificationsに貯めこまない
          if (INSTALLATION_FEE_OF_DAY.gt(0)) {
            await notifyRentalFeeCollect(dateStr, owner.id);
          }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientUnknownRequestError) {
            if (e.message.includes("teras_balance_over_zero")) {
              // Teras不足による制約違反は徴収時に残高が不足しているので個別徴収に行く
              warn({ msg: "teras_balance_over_zero constraint failed" });
              success = false;
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
      }

      // AMOのTeras残高<Feeの合計の場合
      // もしくは、一括徴収処理をしたがクラフト等でTeras残高を減らしていて処理に失敗した
      if (!success) {
        const ownerArcadeMachineFees = await prisma.rentalFee.findMany({
          where: {
            date: dateStr,
            arcadeMachineOwnerId: row.amoid,
            collectState: CollectState.UNPROCESSED,
          },
        });
        let lowerTerasBalanced = false;
        for (const amFee of ownerArcadeMachineFees) {
          if (!lowerTerasBalanced) {
            try {
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: amFee.arcadeMachineOwnerId },
                  data: { terasBalance: { decrement: amFee.fee } },
                }),
                prisma.rentalFee.update({
                  where: {
                    date_arcadeMachineId: {
                      date: amFee.date,
                      arcadeMachineId: amFee.arcadeMachineId,
                    },
                    collectState: CollectState.UNPROCESSED,
                  },
                  data: {
                    collectState: CollectState.COLLECTED,
                    collectDate: new Date(),
                  },
                }),
              ]);
            } catch (e) {
              if (e instanceof Prisma.PrismaClientUnknownRequestError) {
                if (e.message.includes("teras_balance_over_zero")) {
                  // Terasの制約違反なので残高不足
                  lowerTerasBalanced = true;
                } else {
                  throw e;
                }
              } else {
                throw e;
              }
            }
          }
          if (lowerTerasBalanced) {
            // 徴収できないので撤去していく
            await prisma.$transaction([
              prisma.rentalFee.update({
                where: {
                  date_arcadeMachineId: {
                    date: amFee.date,
                    arcadeMachineId: amFee.arcadeMachineId,
                  },
                  collectState: CollectState.UNPROCESSED,
                },
                data: {
                  collectState: CollectState.UNINSTALLED,
                  collectDate: new Date(),
                },
              }),
              prisma.arcadeMachine.update({
                where: {
                  id: amFee.arcadeMachineId,
                },
                data: {
                  gameCenterId: null,
                  position: null,
                  installedAt: null,
                },
              }),
            ]);
          }
        }
        // 賃料が無料の時はNotificationsに貯めこまない
        if (INSTALLATION_FEE_OF_DAY.gt(0)) {
          await notifyRentalFeeCollect(dateStr, row.amoid);
        }
      }
    }
    info({ msg: "collect fees end." });
  }

  async payFees(dateStr: string) {
    const gcFees: any[] = await prisma.$queryRaw`
      select
          game_center_owner_id        as gco_id,
          sum(fee)                    as sum_fees,
          count(game_center_owner_id) as count_records
      from rental_fees
      where date = ${dateStr}
      and collect_state = 'COLLECTED'
      and payment_state = 'UNPROCESSED'
      group by game_center_owner_id
    `;

    info({ msg: `pay fees start. unique GC owner count:[${gcFees.length}]` });
    for (const gcFee of gcFees) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: gcFee.gco_id },
            data: {
              terasBalance: {
                increment: gcFee.sum_fees,
              },
            },
          });
          const { count } = await tx.rentalFee.updateMany({
            where: {
              date: dateStr,
              gameCenterOwnerId: gcFee.gco_id,
              collectState: CollectState.COLLECTED,
            },
            data: {
              paymentState: PaymentState.PAID,
              paymentDate: new Date(),
            },
          });

          if (BigInt(count) !== gcFee.count_records) {
            throw new IllegalStateUseCaseError(
              `updated count ${count}, but want update records ${gcFee.count_records}`,
            );
          }
        });
        // 賃料が発生していない時はNotificationsに貯めこまない
        if (INSTALLATION_FEE_OF_DAY.gt(0)) {
          await notifyRentalFeePayment(dateStr, gcFee.gco_id);
        }
      } catch (e: unknown) {
        error({
          msg: `payment failed. owner[${gcFee.gco_id}], fee[${gcFee.sum_fees}]`,
          error: e,
        });
      }
    }
    info({ msg: "pay fees end." });
  }
}
