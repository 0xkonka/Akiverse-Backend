import { Prisma, PrismaClient } from "@prisma/client";

Prisma.Decimal.set({ precision: 78 });

const prismaClient = new PrismaClient({
  // TODO: 環境変数からlog設定を読み込む
  /*
  log: [
    {
      emit: "stdout",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
    {
      emit: "stdout",
      level: "info",
    },
    {
      emit: "stdout",
      level: "warn",
    },
  ],
   */
});

export default prismaClient;

// https://www.prisma.io/docs/reference/api-reference/error-reference
export const PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";
export const PRISMA_NOT_FOUND_ERROR_CODE = "P2025";
export const PRISMA_INCONSISTENT_COLUMN = "P2023";
