import {
  CollectFeeUseCase,
  CollectFeeUseCaseImpl,
} from "../../use_cases/collect_fee_usecase";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../../constants";
import { error, info } from "../../utils";

const useCase: CollectFeeUseCase = new CollectFeeUseCaseImpl();
async function main() {
  let dateStr;
  const commandArgs = process.argv;
  if (commandArgs.length !== 3) {
    dateStr = dayjs().tz(TERM_TIME_ZONE).format("YYYYMMDD");
  } else {
    dateStr = process.argv[2];
  }

  try {
    info({ msg: `collect fee batch start. target:[${dateStr}]` });
    await useCase.Execute(dateStr);
    info("collect fee batch end.");
  } catch (e: unknown) {
    error({ error: e });
  }
}

if (require.main === module) {
  main();
}
