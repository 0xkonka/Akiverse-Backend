import { createMockContextNonAuth } from "../mock/context";
import { ImageUploadUseCaseImpl } from "../../src/use_cases/image_upload_usecase";
import { BannerImageType } from "@prisma/client";
import { eraseDatabase } from "../test_helper";
import { InvalidArgumentUseCaseError } from "../../src/use_cases/errors";

const useCase = new ImageUploadUseCaseImpl();
describe("prepareUploadImage", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("execute", async () => {
    const fileName = "success";
    const ctx = createMockContextNonAuth();
    const ret = await useCase.prepareUploadImage(
      ctx,
      fileName,
      BannerImageType.BANNER,
      "test1",
    );

    expect(ret.preSignedUploadUrl).toBeDefined();
    expect(ret.imageUrl).toEqual("local_ut/front-end/banners/success");
    const db1 = await ctx.prisma.bannerImage.findUnique({
      where: {
        bannerImageType_fileName: {
          fileName: fileName,
          bannerImageType: "BANNER",
        },
      },
    });
    expect(db1).toBeDefined();
    expect(db1).toMatchObject({
      fileName: fileName,
      bannerImageType: BannerImageType.BANNER,
      s3Path: "/front-end/banners/success",
      description: "test1",
    });

    // 同名で2度目は失敗すること
    await expect(
      useCase.prepareUploadImage(
        ctx,
        fileName,
        BannerImageType.BANNER,
        "test2",
      ),
    ).rejects.toThrow(InvalidArgumentUseCaseError);

    // InterstitialBannerとしては同名でもアップロードできる
    const ret2 = await useCase.prepareUploadImage(
      ctx,
      fileName,
      BannerImageType.INTERSTITIAL,
      "test3",
    );

    expect(ret2.preSignedUploadUrl).toBeDefined();
    expect(ret2.imageUrl).toEqual(
      "local_ut/front-end/interstitial_banners/success",
    );

    const db2 = await ctx.prisma.bannerImage.findUnique({
      where: {
        bannerImageType_fileName: {
          fileName: fileName,
          bannerImageType: "INTERSTITIAL",
        },
      },
    });
    expect(db2).toBeDefined();
    expect(db2).toMatchObject({
      fileName: fileName,
      bannerImageType: BannerImageType.INTERSTITIAL,
      s3Path: "/front-end/interstitial_banners/success",
      description: "test3",
    });

    // InterstitialBanner内で同名は失敗すること
    await expect(
      useCase.prepareUploadImage(
        ctx,
        fileName,
        BannerImageType.INTERSTITIAL,
        "test4",
      ),
    ).rejects.toThrow(InvalidArgumentUseCaseError);
  });
});
