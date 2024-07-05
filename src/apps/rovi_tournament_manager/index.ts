import { RoviTournamentManagerUseCaseImpl } from "../../use_cases/rovi_tournament_manager_usecase";

import { ROVI_WEBHOOK_URL_BASE } from "../../constants";
import { BatchContext } from "../../batch_context";

const BATCH_NAME = "ROVI_TOURNAMENT_MANAGER";
async function main() {
  const ctx = new BatchContext(BATCH_NAME);
  const apiToken = process.env.ROVI_BATCH_API_KEY || "";
  if (apiToken === "") {
    ctx.log.error("ROVI_BATCH_API_KEY required");
    return;
  }
  const useCase = new RoviTournamentManagerUseCaseImpl(
    apiToken,
    ROVI_WEBHOOK_URL_BASE,
  );
  try {
    await useCase.updateTournaments(ctx);
    await useCase.exportFinishedTournamentInfo(ctx);
  } catch (e) {
    ctx.log.error(e);
  }
}

if (require.main === module) {
  main();
}
