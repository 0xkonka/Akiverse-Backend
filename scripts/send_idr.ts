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
  const amount = new Prisma.Decimal(43200);
  const entryId = "6b63bfb9-ccf8-4436-b0ff-6b34189a4e03";
  const phoneNumber = "+62 877-3832-2664";

  try {
    await helper.send({ entryId, phoneNumber, amount });
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
