import prisma from "../src/prisma";
import { question } from "readline-sync";
import { info } from "../src/utils";

async function main() {
  const name = question("ユーザー名：");
  const email = question("メールアドレス：");
  const walletAddress = question("ウォレットアドレス：");
  const user = await prisma.user.create({
    data: { name, email, walletAddress },
  });
  info(user);
}

if (require.main === module) {
  main();
}
