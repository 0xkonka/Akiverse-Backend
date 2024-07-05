import { PlayManagerUseCaseImpl } from "../../use_cases/play_manager_usecase";
import { error } from "../../utils";

const intervalMillSeconds = 1000;
const useCase = new PlayManagerUseCaseImpl();
export function main() {
  try {
    setTimeout(async function loop() {
      await useCase.execute();
      setTimeout(loop, intervalMillSeconds);
    }, 0);
  } catch (e) {
    error({
      err: JSON.stringify(e, Object.getOwnPropertyNames(e)),
      msg: "play manager failed",
    });
  }
}

if (require.main === module) {
  main();
}
