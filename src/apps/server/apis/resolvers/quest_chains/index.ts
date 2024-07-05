import { CustomFindManyQuestChainsResolver } from "./current_user_quest_chains";
import { FinishQuestChainResolver } from "./finish_quest_chain";
import { StartQuestChainResolver } from "./start_quest_chain";

const CustomQuestChainResolvers = [
  CustomFindManyQuestChainsResolver,
  FinishQuestChainResolver,
  StartQuestChainResolver,
];

export default CustomQuestChainResolvers;
