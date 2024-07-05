import { CustomFindManyBannersResolver } from "./list_banners";
import { CustomFindManyInterstitialBannersResolver } from "./list_interstitial_banners";

const CustomBannerItemResolvers = [
  CustomFindManyBannersResolver,
  CustomFindManyInterstitialBannersResolver,
];
export default CustomBannerItemResolvers;
