import prisma from "../src/prisma";
import { withdrawArcadeMachine } from "../src/helpers/withdraw";
import { NftState } from "@prisma/client";

const main = async () => {
  const arcadeMachine = await prisma.arcadeMachine.findFirstOrThrow({
    where: { state: NftState.IN_AKIVERSE, gameCenterId: null },
    include: { user: true },
  });
  await withdrawArcadeMachine(arcadeMachine);
};

main();
