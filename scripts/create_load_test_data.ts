import prismaClient from "../src/prisma";
import { generateRefreshToken } from "../src/helpers/token";

function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}
async function main() {
  // Userを100人作る
  const userParam = [...range(1, 100)].map((value) => ({
    name: `load_test_${value}`,
    email: `${value}@load_test`,
  }));

  await prismaClient.user.createMany({
    data: userParam,
  });

  // GCOを一人作る
  const gco = await prismaClient.user.create({
    data: {
      name: "gco_load_test",
      email: "load_test_gco@load_test",
    },
  });

  // GCをゲームの数だけ作る
  const bubbleAttackGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_bubble_attack",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99999,
      yCoordinate: 99999,
    },
  });
  const yummyJumpGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_yummy_jump",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99998,
      yCoordinate: 99998,
    },
  });
  const starGuardianGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_star_guardian",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99997,
      yCoordinate: 99997,
    },
  });
  const cyberPinballGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_cyber_pinball",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99996,
      yCoordinate: 99996,
    },
  });
  const neonBlitzGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_neon_blitz",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99995,
      yCoordinate: 99995,
    },
  });
  const superSnakeGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_super_snake",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99994,
      yCoordinate: 99994,
    },
  });
  const neonPongGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_neon_pong",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99993,
      yCoordinate: 99993,
    },
  });
  const mythicMatchGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_mythic_match",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99992,
      yCoordinate: 99992,
    },
  });
  const akibaFcGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_akiba_fc",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99991,
      yCoordinate: 99991,
    },
  });
  const neonSnapGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_neon_snap",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99990,
      yCoordinate: 99990,
    },
  });
  const ninjaGoGoGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_ninja_go_go",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99989,
      yCoordinate: 99989,
    },
  });
  const mythicSwingGc = await prismaClient.gameCenter.create({
    data: {
      id: "load_test_gc_mythic_swing",
      name: "load test",
      userId: gco.id,
      area: "AKIHABARA",
      size: "LARGE",
      state: "IN_AKIVERSE",
      placementAllowed: true,
      xCoordinate: 99988,
      yCoordinate: 99988,
    },
  });

  // 各ゲームのAMを100個ずつ作る
  await prismaClient.arcadeMachine.createMany({
    data: [
      ...arcadeMachineCreateParam("BUBBLE_ATTACK", gco.id, bubbleAttackGc.id),
      ...arcadeMachineCreateParam("YUMMY_JUMP", gco.id, yummyJumpGc.id),
      ...arcadeMachineCreateParam("STAR_GUARDIAN", gco.id, starGuardianGc.id),
      ...arcadeMachineCreateParam("CYBER_PINBALL", gco.id, cyberPinballGc.id),
      ...arcadeMachineCreateParam("NEON_BLITZ", gco.id, neonBlitzGc.id),
      ...arcadeMachineCreateParam("SUPER_SNAKE", gco.id, superSnakeGc.id),
      ...arcadeMachineCreateParam("NEON_PONG", gco.id, neonPongGc.id),
      ...arcadeMachineCreateParam("MYTHIC_MATCH", gco.id, mythicMatchGc.id),
      ...arcadeMachineCreateParam("AKIBA_FC", gco.id, akibaFcGc.id),
      ...arcadeMachineCreateParam("NEON_SNAP", gco.id, neonSnapGc.id),
      ...arcadeMachineCreateParam("NINJA_GO_GO", gco.id, ninjaGoGoGc.id),
      ...arcadeMachineCreateParam("MYTHIC_SWING", gco.id, mythicSwingGc.id),
    ],
  });
  // game_settingsがなかったら作る
  await checkAndCreateGameSetting("BUBBLE_ATTACK");
  await checkAndCreateGameSetting("YUMMY_JUMP");
  await checkAndCreateGameSetting("STAR_GUARDIAN");
  await checkAndCreateGameSetting("CYBER_PINBALL");
  await checkAndCreateGameSetting("NEON_BLITZ");
  await checkAndCreateGameSetting("SUPER_SNAKE");
  await checkAndCreateGameSetting("NEON_PONG");
  await checkAndCreateGameSetting("MYTHIC_MATCH");
  await checkAndCreateGameSetting("AKIBA_FC");
  await checkAndCreateGameSetting("NEON_SNAP");
  await checkAndCreateGameSetting("NINJA_GO_GO");
  await checkAndCreateGameSetting("MYTHIC_SWING");

  // Userのアクセストークンをログに吐く
  const users = await prismaClient.user.findMany({
    where: {
      name: {
        startsWith: "load_test_",
      },
    },
  });
  for (const user of users) {
    const token = await generateRefreshToken(user);
    console.log(token);
  }
}

function arcadeMachineCreateParam(
  game: string,
  gcoId: string,
  gcId: string,
): any[] {
  return [...range(1, 100)].map((value) => {
    return {
      userId: gcoId,
      game: game,
      gameCenterId: gcId,
      position: value,
      accumulatorSubCategory: "HOKUTO_100_LX",
    };
  });
}

async function checkAndCreateGameSetting(game: string): Promise<void> {
  const hasBubbleAttackSetting = await prismaClient.gameSetting.findUnique({
    where: {
      game: game,
    },
  });
  if (!hasBubbleAttackSetting) {
    await prismaClient.gameSetting.create({
      data: {
        game: game,
        difficulty: 1,
        targetScore: 10,
        dailyMaxPlayCount: 500,
      },
    });
  }
}

if (require.main === module) {
  main();
}
