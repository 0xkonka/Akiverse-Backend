import {
  LoginResponse,
  LoginUseCase,
  TokenRefreshResponse,
} from "../../../src/use_cases/login_usecase";
import { Context } from "../../../src/context";

export class LoginUseCaseMock implements LoginUseCase {
  returnValueForLoginResponse: LoginResponse | null = null;
  throwError: any | null = null;

  reset(): void {
    this.returnValueForLoginResponse = null;
    this.throwError = null;
  }
  async emailLogin(ctx: Context, didToken: string): Promise<LoginResponse> {
    return this.login();
  }

  async walletLogin(
    ctx: Context,
    message: string,
    signature: string,
  ): Promise<LoginResponse> {
    return this.login();
  }

  private async login(): Promise<LoginResponse> {
    if (this.throwError) throw this.throwError;
    if (!this.returnValueForLoginResponse) throw Error("setup error");
    return this.returnValueForLoginResponse;
  }

  async tokenRefresh(
    ctx: Context,
    refreshToken: string,
    requestFirebase: boolean,
  ): Promise<TokenRefreshResponse> {
    return {
      accessToken: "a",
      firebaseCustomToken: "b",
    };
  }

  async updateClaims(ctx: Context): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
