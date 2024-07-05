import { IconType, Prisma, User } from "@prisma/client";
import { Context } from "../context";
import {
  getIssuerByToken,
  getMetadataByToken,
  validateMagicToken,
} from "../helpers/auth";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  UnhandledUseCaseError,
} from "./errors";
import { Inject, Service } from "typedi";
import { EXTRA_BAD_WORDS, EXTRA_WHITE_WORDS } from "../bad_words";
import { Profanity, ProfanityOptions } from "@2toad/profanity";
import { globalLogger } from "../logger";
import { ProfilePictureNftUseCase } from "./eth_nfts/profile_picture_nft_usecase";
import {
  setUserClaims,
  verifyIdTokenForCreateUser,
} from "../helpers/firebase_auth";

export interface UserUseCase {
  /** @deprecated Firebaseログイン実装後削除します*/
  createFromMagic(ctx: Context, didToken: string, name: string): Promise<User>;
  createFromFirebase(
    ctx: Context,
    idToken: string,
    name: string,
  ): Promise<User>;

  update(
    ctx: Context,
    name: string,
    iconType: IconType,
    iconSubCategory: string,
    titleSubCategory: string,
    frameSubCategory: string,
  ): Promise<User>;
}
@Service()
export class UserUseCaseImpl implements UserUseCase {
  // 半角英数字と-_.の記号を許容
  static validNameRegex = new RegExp(/^[a-zA-Z0-9.\-_]{1,20}$/);
  static validNameSymbolRegex = new RegExp(/[.\-_]/g);
  private readonly profanity: Profanity;

  constructor(
    @Inject("nfts.useCase")
    private readonly nftsUseCase: ProfilePictureNftUseCase,
  ) {
    const options = new ProfanityOptions();
    options.wholeWord = true; // false:partial match/true:exact match
    this.profanity = new Profanity(options);
    if (EXTRA_BAD_WORDS.length > 0) {
      this.profanity.addWords(EXTRA_BAD_WORDS);
    }
    if (EXTRA_WHITE_WORDS.length > 0) {
      this.profanity.whitelist.addWords(EXTRA_WHITE_WORDS);
    }
  }

  async createFromFirebase(
    ctx: Context,
    idToken: string,
    name: string,
  ): Promise<User> {
    let decode;
    try {
      decode = await verifyIdTokenForCreateUser(ctx, idToken);
    } catch (e) {
      throw new InvalidArgumentUseCaseError("idToken is invalid");
    }
    const validatorResponse = this.isValidName(name);
    if (!validatorResponse.valid) {
      throw new InvalidArgumentUseCaseError(validatorResponse.message);
    }
    if (!decode.email) {
      throw new InvalidArgumentUseCaseError("email required");
    }
    try {
      const created = await ctx.prisma.user.create({
        data: {
          email: decode.email,
          name: name,
          // walletAddressはユーザー作成時に入ることがない
        },
      });
      await setUserClaims(ctx, created.id, decode.uid);
      return created;
    } catch (e) {
      // ユニーク制約違反だったらすでに存在しているのでIllegal State
      //https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new IllegalStateUseCaseError("same email address user is exist");
      } else if (e instanceof Error) {
        throw new UnhandledUseCaseError("create user failed", e);
      }
      // それ以外は上位にそのまま投げる
      throw e;
    }
  }
  /** @deprecated Firebaseログイン実装後削除します*/
  async createFromMagic(
    ctx: Context,
    didToken: string,
    name: string,
  ): Promise<User> {
    if (!validateMagicToken(didToken)) {
      throw new InvalidArgumentUseCaseError("didToken is invalid");
    }

    const validatorResponse = this.isValidName(name);
    if (!validatorResponse.valid) {
      throw new InvalidArgumentUseCaseError(validatorResponse.message);
    }

    const userMetadata = await getMetadataByToken(didToken);
    if (!userMetadata.email) {
      throw new InvalidArgumentUseCaseError("email address required");
    }
    const issuer = getIssuerByToken(didToken);
    try {
      return await ctx.prisma.user.create({
        data: {
          email: userMetadata.email,
          name: name,
          magicSessions: {
            connectOrCreate: {
              create: {
                issuer,
                lastLoginAt: userMetadata.issuedAt,
              },
              where: { issuer },
            },
          },
        },
      });
    } catch (e) {
      // ユニーク制約違反だったらすでに存在しているのでIllegal State
      //https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new IllegalStateUseCaseError("same email address user is exist");
      } else if (e instanceof Error) {
        throw new UnhandledUseCaseError("create user failed", e);
      }
      // それ以外は上位にそのまま投げる
      throw e;
    }
  }
  async update(
    ctx: Context,
    name: string,
    iconType: IconType,
    iconSubCategory: string,
    titleSubCategory: string,
    frameSubCategory: string,
  ): Promise<User> {
    const validatorResponse = this.isValidName(name);
    if (!validatorResponse.valid) {
      throw new InvalidArgumentUseCaseError(validatorResponse.message);
    }

    // アイコンを保有しているかチェック
    if (iconType === IconType.IN_WORLD) {
      // IN_WORLDアイテム
      if (iconSubCategory !== "DEFAULT") {
        const find = await ctx.prisma.collectibleItem.findUnique({
          where: {
            userId_category_subCategory: {
              userId: ctx.userId!,
              category: "ICON",
              subCategory: iconSubCategory,
            },
          },
        });
        if (!find) {
          throw new InvalidArgumentUseCaseError("Icons not held are specified");
        }
      }
    } else if (iconType === IconType.NFT) {
      const iconList = await this.nftsUseCase.listProfileIconImages(ctx);
      const find = iconList.find((value) => value.tokenId === iconSubCategory);
      if (!find) {
        throw new InvalidArgumentUseCaseError("Icons not held are specified");
      }
    }

    // 称号を保有しているかチェック
    if (titleSubCategory !== "DEFAULT") {
      const find = await ctx.prisma.collectibleItem.findUnique({
        where: {
          userId_category_subCategory: {
            userId: ctx.userId!,
            category: "TITLE",
            subCategory: titleSubCategory,
          },
        },
      });
      if (!find) {
        throw new InvalidArgumentUseCaseError("Title not held are specified");
      }
    }

    // フレームを保有しているかチェック
    if (frameSubCategory !== "DEFAULT") {
      const find = await ctx.prisma.collectibleItem.findUnique({
        where: {
          userId_category_subCategory: {
            userId: ctx.userId!,
            category: "FRAME",
            subCategory: frameSubCategory,
          },
        },
      });
      if (!find) {
        throw new InvalidArgumentUseCaseError("Frame not held are specified");
      }
    }

    try {
      const update = await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          name: name,
          iconType: iconType,
          iconSubCategory: iconSubCategory,
          titleSubCategory: titleSubCategory,
          frameSubCategory: frameSubCategory,
        },
      });
      if (ctx.firebaseId !== "") {
        // Firebaseログインしていたらクレーム更新
        await setUserClaims(ctx, ctx.userId!, ctx.firebaseId);
      }
      return update;
    } catch (e: unknown) {
      throw new UnhandledUseCaseError("user name update failed", e);
    }
  }

  isValidName(name: string): ValidateResponse {
    // length
    // 文字種
    const lengthAndTypeValid = UserUseCaseImpl.validNameRegex.test(name);
    if (!lengthAndTypeValid) {
      return {
        valid: false,
        message: "Name is limited to 20 characters",
      };
    }
    // bad word check
    // 記号でspace splitし、ワード単位に完全一致する場合は禁止ワードが含まれている
    const splitName = name.replaceAll(
      UserUseCaseImpl.validNameSymbolRegex,
      " ",
    );
    if (this.profanity.exists(splitName)) {
      globalLogger.info({ profanityName: name }, "Profanity name info");
      return {
        valid: false,
        message: "include bad word.",
      };
    }
    return {
      valid: true,
      message: "",
    };
  }
}

type ValidateResponse = {
  valid: boolean;
  message: string;
};
