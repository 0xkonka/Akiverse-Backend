import { ArcadePart, ExtractJunkInventory, NftState } from "@prisma/client";
import { choice, getRandomInt } from "../src/utils";
import { allParts } from "../src/metadata/arcade-parts";
import prisma from "../src/prisma";

async function createArcadeParts(count: number): Promise<ArcadePart[]> {
  const arcadeParts: ArcadePart[] = [];
  for (let i = 0; i < count; i++) {
    const state = NftState.IN_AKIVERSE;
    const { category, subCategory } = choice(allParts);
    const ap = await prisma.arcadePart.create({
      data: {
        state,
        category,
        subCategory,
      },
    });
    arcadeParts.push(ap);
  }
  return arcadeParts;
}

async function createJunk(): Promise<ExtractJunkInventory[]> {
  const junks: ExtractJunkInventory[] = [];
  for (const p of allParts) {
    const junk = await prisma.extractJunkInventory.create({
      data: {
        category: p.category,
        subCategory: p.subCategory,
        amount: getRandomInt(0, 100),
      },
    });
    junks.push(junk);
  }
  return junks;
}

async function createExtractInitialInventory(
  arcadeParts: ArcadePart[],
  junks: ExtractJunkInventory[],
): Promise<void> {
  const season = await prisma.season.create({
    data: {
      startAt: new Date(),
      baseExtractItemCount: 8,
    },
  });

  const arcadePartTypeMap = new Map<string, Item>();
  for (const arcadePart of arcadeParts) {
    const key = `${arcadePart.category}-${arcadePart.subCategory}`;
    const item = arcadePartTypeMap.get(key);
    if (item) {
      item.amount = item.amount + 1;
      arcadePartTypeMap.set(key, item);
    } else {
      arcadePartTypeMap.set(key, {
        category: arcadePart.category,
        subCategory: arcadePart.subCategory,
        amount: 1,
      });
    }
  }
  for (const elm of arcadePartTypeMap) {
    await prisma.extractInitialInventory.create({
      data: {
        seasonId: season.id,
        category: elm[1].category,
        subCategory: elm[1].subCategory,
        initialAmount: elm[1].amount,
        itemType: "ARCADE_PART",
        featuredItem: false,
      },
    });
  }

  for (const junk of junks) {
    await prisma.extractInitialInventory.create({
      data: {
        seasonId: season.id,
        category: junk.category,
        subCategory: junk.subCategory,
        initialAmount: junk.amount,
        itemType: "JUNK_PART",
        featuredItem: false,
      },
    });
  }
}

type Item = {
  category: string;
  subCategory: string;
  amount: number;
};

async function main() {
  const arcadeParts = await createArcadeParts(10);
  const junks = await createJunk();
  await createExtractInitialInventory(arcadeParts, junks);
}

if (require.main === module) {
  main();
}
