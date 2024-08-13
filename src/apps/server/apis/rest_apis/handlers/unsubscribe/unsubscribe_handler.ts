import { Service } from "typedi";
import { UnsubscribeUseCase } from "../../../../../../use_cases/unsubscribe_usecase";
import getContext from "../../../../../../context";
import { bind } from "bind-decorator";
import { Request, Response } from "express";

@Service()
export class UnsubscribeHandler {
  constructor(readonly useCase: UnsubscribeUseCase) {}

  @bind
  async get(req: Request, res: Response) {
    const ctx = getContext(req)!;
    const token = req.query.token as string;
    if (token) {
      const email = await this.useCase.getEmailFromToken(ctx, token);
      if (email) {
        res.render("unsubscribe_form", {
          data: { email, token },
        });
        return;
      }
    }
    res.status(404).send("Page not found");
  }

  @bind
  async post(req: Request, res: Response) {
    const ctx = getContext(req)!;
    const token = req.query.token as string;
    if (token) {
      const email = await this.useCase.getEmailFromToken(ctx, token);
      if (email) {
        await this.useCase.unsubscribeUser(ctx, email);
        res.render("unsubscribe_success", { data: { email } });
        return;
      }
    }
    res.status(404).send("Page not found");
  }
}
