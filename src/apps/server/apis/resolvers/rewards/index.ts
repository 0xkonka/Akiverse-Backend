import { CustomFindManyRewardsResolver } from "./current_user_rewards";
import { ReceiveRewardsResolver } from "./accept_rewards";
import RewardNameResolver from "./reward_name";

const CustomRewardResolvers = [
  CustomFindManyRewardsResolver,
  ReceiveRewardsResolver,
  RewardNameResolver,
];

export default CustomRewardResolvers;
