import { SpnPayHelper } from "../src/helpers/spnpay";
import { toBoolean } from "validator";
import { Prisma } from "@prisma/client";

async function main() {
  const spnPayKey = process.env.SPN_PAY_KEY;
  const spnPaySecret = process.env.SPN_PAY_SECRET;
  const isSandbox = toBoolean(process.env.SPN_PAY_SANDBOX || "false");

  if (!spnPayKey || !spnPaySecret) {
    console.log("SPN_PAY_KEY and SPN_PAY_SECRET required");
    return;
  }

  const helper = new SpnPayHelper(spnPayKey, spnPaySecret, isSandbox);
  const transactionId = "a18a9470-63e8-437f-8d30-db52ee8045e2";

  try {
    await helper.checkTransaction(transactionId);
  } catch (e: unknown) {
    console.log(e);
  }
}

function usage() {
  console.log("Usage: \n yarn send_idr tournament-id");
  console.log(
    "require environment variables is SPN_PAY_KEY,SPN_PAY_SECRET,SPN_PAY_IS_SANDBOX",
  );
}

if (require.main === module) {
  main();
}
