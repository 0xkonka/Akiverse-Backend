import { User } from "@prisma/client";
import { Context } from "../../../src/context";
import { WalletAddressUseCase } from "../../../src/use_cases/wallet_address_usecase";

export class WalletAddressUseCaseMock implements WalletAddressUseCase {
  returnValueForRegister: User | null = null;
  throwErrorForRegister: any | null = null;
  async register(
    ctx: Context,
    message: string,
    signature: string,
  ): Promise<User> {
    if (this.throwErrorForRegister) throw this.throwErrorForRegister;
    if (!this.returnValueForRegister) throw Error("setup error");
    return this.returnValueForRegister;
  }

  useCaseReset(): void {
    this.returnValueForRegister = null;
    this.throwErrorForRegister = null;
  }
}
