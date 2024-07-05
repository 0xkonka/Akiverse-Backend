import { Context } from "../context";
import { BannerImageType } from "@prisma/client";
import {
  IMAGE_ASSET_S3_BUCCKET_REGION,
  IMAGE_ASSET_S3_BUCKET_NAME,
  IMAGE_ASSET_URL_BASE,
  LOCAL_DEVELOPMENT,
} from "../constants";
import { Service } from "typedi";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { HttpRequest } from "@smithy/protocol-http";
import { S3RequestPresigner } from "@aws-sdk/s3-request-presigner";
import { parseUrl } from "@smithy/url-parser";
import { formatUrl } from "@aws-sdk/util-format-url";
import { Hash } from "@smithy/hash-node";
import { InvalidArgumentUseCaseError } from "./errors";

export type PrepareUploadImageResponse = {
  preSignedUploadUrl: string;
  imageUrl: string;
};
// bucket rootの下にfront-end/~で配置する
const frontendImagePathPrefix = "/front-end";

export interface ImageUploadUseCase {
  getImageUrl(s3Path: string): string;

  prepareUploadImage(
    ctx: Context,
    fileName: string,
    bannerImageType: BannerImageType,
    description?: string,
  ): Promise<PrepareUploadImageResponse>;
}

@Service("imageUpload.useCase")
export class ImageUploadUseCaseImpl implements ImageUploadUseCase {
  private readonly bucketName: string;
  private readonly region: string;
  private readonly assetUrlBase: string;
  constructor() {
    if (IMAGE_ASSET_S3_BUCKET_NAME === "") {
      throw new Error("Image asset save bucket name required");
    }
    this.bucketName = IMAGE_ASSET_S3_BUCKET_NAME;
    this.region = IMAGE_ASSET_S3_BUCCKET_REGION;
    if (IMAGE_ASSET_URL_BASE === "") {
      throw new Error("Image asset URL required");
    }
    this.assetUrlBase = IMAGE_ASSET_URL_BASE;
  }
  getImageUrl(s3Path: string): string {
    return this.assetUrlBase + s3Path;
  }
  async prepareUploadImage(
    ctx: Context,
    fileName: string,
    bannerImageType: BannerImageType,
    description?: string | undefined,
  ): Promise<PrepareUploadImageResponse> {
    const key = this.createS3Key(bannerImageType, fileName);

    // 同種同名のファイルが存在する場合はエラーにする
    const sameImageFile = await ctx.prisma.bannerImage.findUnique({
      where: {
        bannerImageType_fileName: {
          bannerImageType: bannerImageType,
          fileName: fileName,
        },
      },
    });
    if (sameImageFile) {
      throw new InvalidArgumentUseCaseError("same image file already exists");
    }

    // S3の署名付きURLを生成して返す
    const url = parseUrl(
      LOCAL_DEVELOPMENT
        ? `http://localhost:9000/${this.bucketName}${key}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com${key}`,
    );

    // LocalではminioでS3のモックをしているのでそちらのクレデンシャルを使用する
    const credentialProvider = LOCAL_DEVELOPMENT
      ? {
          accessKeyId: "minioroot",
          secretAccessKey: "miniorootpass",
        }
      : defaultProvider();
    const presigner = new S3RequestPresigner({
      credentials: credentialProvider,
      region: this.region,
      sha256: Hash.bind(null, "sha256"),
    });

    const signedUrlObject = await presigner.presign(
      new HttpRequest({ ...url, method: "PUT" }),
      {
        expiresIn: 600, // 10min
      },
    );
    const preSignedUrl = formatUrl(signedUrlObject);

    // DBに保存
    await ctx.prisma.bannerImage.create({
      data: {
        bannerImageType: bannerImageType,
        fileName: fileName,
        s3Path: key,
        description: description,
      },
    });

    return {
      preSignedUploadUrl: preSignedUrl,
      imageUrl: this.getImageUrl(key),
    };
  }

  private createS3Key(
    bannerImageType: BannerImageType,
    fileName: string,
  ): string {
    switch (bannerImageType) {
      case "BANNER":
        return frontendImagePathPrefix + "/banners/" + fileName;
      case "INTERSTITIAL":
        return frontendImagePathPrefix + "/interstitial_banners/" + fileName;
      case "PAID_TOURNAMENT":
        return frontendImagePathPrefix + "/paid_tournaments/" + fileName;
    }
  }
}
