import ListRandomArcadeMachines from "./list_random_arcade_machines";
import ArcadeMachineUpdateResolver from "./update";
import ExtractInfoResolver from "./extract_info";
import DismantleResolver from "./dismantle";

const CustomArcadeMachineResolvers = [
  ListRandomArcadeMachines,
  ArcadeMachineUpdateResolver,
  ExtractInfoResolver,
  DismantleResolver,
];

export default CustomArcadeMachineResolvers;
