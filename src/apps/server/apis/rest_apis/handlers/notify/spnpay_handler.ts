import { bind } from "bind-decorator";
import { Request, Response } from "express";
import { saveCallbackInfo } from "../../../../../../helpers/spnpay";
import getContext from "../../../../../../context";

export class SPNPayHandler {
  @bind
  async post(req: Request, res: Response) {
    const ctx = getContext(req)!;
    ctx.log.info(
      {
        SPNPayCallback: req.body,
      },
      "SPNPayCallbackPayload",
    );
    const ret = await saveCallbackInfo(ctx, req.body);
    res.status(ret ? 200 : 400);
    res.json(
      JSON.stringify({
        status: ret ? 200 : 400,
      }),
    );
  }
}
