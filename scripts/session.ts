import { question } from "readline-sync";
import prisma from "../src/prisma";
import { hashSessionToken, randomSessionToken } from "../src/helpers/auth";
import { MORALIS_SESSION_PREFIX } from "../src/constants";
import { v4 as uuidv4 } from "uuid";
import { info } from "../src/utils";

async function main() {
  const email = question("メールアドレス：");
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: email },
  });

  if (!user.walletAddress) {
    info({ msg: "wallet address is required" });
    return;
  }
  const st = randomSessionToken(MORALIS_SESSION_PREFIX);
  const tokenHash = hashSessionToken(st);

  await prisma.moralisSession.create({
    data: {
      challengeId: uuidv4(),
      expiresAt: new Date(),
      tokenHash: tokenHash,
      walletAddress: user.walletAddress,
      verified: true,
      message: "",
      chain: "",
      network: "",
      nonce: "hoge",
      version: "1",
      profileId: uuidv4(),
    },
  });
  info({
    msg: "session token",
    st,
  });
  return;
}

if (require.main === module) {
  main();
}
