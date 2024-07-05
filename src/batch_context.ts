import prismaClient from "./prisma";
import { globalLogger } from "./logger";
import { PrismaClient } from "@prisma/client";
import pino from "pino";

export class BatchContext {
  constructor(name: String) {
    this.prisma = prismaClient;
    this._log = globalLogger.child({ batchName: name });
  }
  prisma: PrismaClient;
  private readonly _log: pino.Logger;

  get log(): pino.Logger {
    return this._log;
  }
}
