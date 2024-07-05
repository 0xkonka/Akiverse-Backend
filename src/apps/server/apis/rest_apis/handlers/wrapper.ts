import { toHandlerError } from "../errors";
import { NextFunction, Request, Response } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;
/**
 * usage: app.use("/path/,asyncWrapper(async (req,res,next) => {}))
 */
export const asyncWrapper = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return fn(req, res, next).catch(toHandlerError(next));
  };
};
