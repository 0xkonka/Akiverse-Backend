import { readFileSync, writeFileSync } from "fs";
import { question } from "readline-sync";
import Papa from "papaparse";
import { choice, randomBigInt } from "../src/utils";
import { allParts, ArcadePartTypeId } from "../src/metadata/arcade-parts";
import { ArcadePartCategory, NftState } from "@prisma/client";
import { withdrawArcadeParts } from "../src/helpers/withdraw";
import prisma from "../src/prisma";

const OPENSEA_BASE_URL =
  "https://opensea.io/ja/assets/matic/0xa0c5bedfe27855537ddeb46abdae06ed3ac9187d/";

type CompleteRow = {
  id: string;
  category: ArcadePartCategory;
  subCategory: string;
  ownerWalletAddress: string;
  userId?: string;
};

function getMissingFields(fields: string[]) {
  return ["category", "subCategory", "id"].filter((f) => !fields.includes(f));
}

function randomArcadePartTypeId(): ArcadePartTypeId {
  const { category, subCategory } = choice(allParts);
  return { category, subCategory };
}

function addMissingData(rows: any[]) {
  return rows.map((row) => ({
    id: randomBigInt().toString(),
    ...randomArcadePartTypeId(),
    ...row,
  }));
}

async function airdropAp(rows: CompleteRow[]) {
  console.log(rows.length, "rows found in CSV file.\n");
  const addresses = rows.map((row) => row.ownerWalletAddress);
  const ids = rows.map((row) => row.id);
  // check existing
  const existingAps = await prisma.arcadePart.findMany({
    where: { id: { in: ids } },
  });
  if (existingAps.length > 0) {
    console.log(
      existingAps.length,
      "IDs found in the CSV file belong to existing Arcade Parts.",
    );
    console.log(existingAps.length, "Existing Arcade Parts:");
    console.table(
      existingAps.map((ap) => ({
        id: ap.id,
        userId: ap.userId,
        ownerWalletAddress: ap.ownerWalletAddress,
        category: ap.category,
        subCategory: ap.subCategory,
        state: ap.state,
      })),
    );
    const inAkiverseAps = existingAps.filter(
      (ap) => ap.state === NftState.IN_AKIVERSE,
    );
    if (inAkiverseAps.length > 0) {
      console.log(
        inAkiverseAps.length,
        "APs are still IN_AKIVERSE. It is possible to retry the withdrawal for these APs.",
      );
      const shouldRetry = question("Retry withdrawal? (y/n): ") === "y";
      if (shouldRetry) {
        for (const row of inAkiverseAps) {
          const arcadePartWithUser = await prisma.arcadePart.findUniqueOrThrow({
            where: { id: row.id },
            include: { user: { select: { id: true, walletAddress: true } } },
          });
          console.log("Preparing withdrawal...");
          const withdrawal = await withdrawArcadeParts(arcadePartWithUser);
          console.log(withdrawal);
        }
        return;
      }
    }
    console.log("Please edit the CSV file and rerun this script if necessary.");
    return;
  }
  // set userIds
  const existingUsers = await prisma.user.findMany({
    where: { walletAddress: { in: addresses } },
    select: { id: true, name: true, email: true, walletAddress: true },
  });
  if (existingUsers.length > 0) {
    console.log(
      `${existingUsers.length} (of ${rows.length} total) wallet addresses belong to existing users:`,
    );
    console.table(
      existingUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
      })),
    );
    console.log();
    const addressesToIds = new Map<string, string>(
      existingUsers.map((user) => [user.walletAddress!.toLowerCase(), user.id]),
    );
    for (const row of rows) {
      if (addressesToIds.has(row.ownerWalletAddress.toLowerCase())) {
        row.userId = addressesToIds.get(row.ownerWalletAddress.toLowerCase());
      }
    }
    console.log("The following APs will be created:");
    console.table(rows);
  }
  // create APs
  for (const row of rows) {
    console.log();
    console.log("Creating Arcade Part", row);
    const arcadePart = await prisma.arcadePart.create({
      data: {
        id: row.id,
        category: row.category,
        subCategory: row.subCategory,
        ownerWalletAddress: row.ownerWalletAddress,
        userId: row.userId || null,
      },
    });
    const arcadePartWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: row.id },
      include: { user: { select: { id: true, walletAddress: true } } },
    });
    console.log("Preparing withdrawal...");
    const withdrawal = await withdrawArcadeParts(arcadePartWithUser);
    console.log(withdrawal);
  }
  console.log("Confirm APs at these URLs:");
  for (const row of rows) {
    console.log(OPENSEA_BASE_URL + row.id);
  }
  console.log("Done.");
}

function main() {
  // Get CSV data
  const commandArgs = process.argv;
  if (commandArgs.length !== 3) {
    console.log("Usage:\n  yarn airdrop-ap list.csv");
    return;
  }
  const csvFilename = commandArgs[2];
  const csvRaw = readFileSync(csvFilename, { encoding: "utf-8" });
  const parsedFile = Papa.parse(csvRaw, { header: true, skipEmptyLines: true });
  const fields = parsedFile.meta.fields;
  // Check that CSV contains Wallet Addresses
  if (fields === undefined) {
    console.log("CSV file has no columns.");
    return;
  }
  if (!fields.includes("ownerWalletAddress")) {
    console.log('CSV must contain an "ownerWalletAddress" column.');
    return;
  }
  // Check that all required fields are present
  const missingFields = getMissingFields(fields);
  if (missingFields.length === 0) {
    airdropAp(parsedFile.data as any as CompleteRow[]);
  } else {
    // Augment CSV
    console.log("The following fields are missing:", missingFields.join(", "));
    console.log(
      "These data may be generated randomly. Enter a filename to save to (Ctrl-C to cancel).",
    );
    const outfile =
      question("Enter an output filename (output.csv): ") || "output.csv";
    const fixedRows = addMissingData(parsedFile.data);
    console.table(fixedRows);
    console.log(`Saving to ${outfile}...`);
    const outData = Papa.unparse(fixedRows);
    writeFileSync(outfile, outData);
    console.log(
      `Done. You may now run "yarn airdrop-ap ${outfile}" to perform the airdrop.`,
    );
  }
}

if (require.main === module) {
  main();
}
