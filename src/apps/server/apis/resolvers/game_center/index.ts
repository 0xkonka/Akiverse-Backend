import ListPlacementArcadeMachinesResolver from "./list_placement_arcade_machines";
import StartRecruitArcadeMachineResolver from "./start_recruit_arcade_machine";
import StopRecruitArcadeMachineResolver from "./stop_recruit_arcade_machine";
import WithdrawGameCenterResolver from "./withdraw_game_center";
import DepositGameCenterResolver from "./deposit_game_center";
import InstallationFeeFieldResolver from "./installation_fee";
import GameCenterMetadataFieldResolver from "./metadata";

const CustomGameCenterResolvers = [
  ListPlacementArcadeMachinesResolver,
  StartRecruitArcadeMachineResolver,
  StopRecruitArcadeMachineResolver,
  WithdrawGameCenterResolver,
  DepositGameCenterResolver,
  InstallationFeeFieldResolver,
  GameCenterMetadataFieldResolver,
];

export default CustomGameCenterResolvers;
