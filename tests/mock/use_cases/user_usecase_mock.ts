import { UserUseCase } from "../../../src/use_cases/user_usecase";
import { Context } from "../../../src/context";
import { IconType, User } from "@prisma/client";

export class UserUseCaseMock implements UserUseCase {
  returnValueForCreate: User | null = null;
  throwErrorForCreate: any | null = null;

  returnValueForUpdate: User | null = null;
  throwErrorForUpdate: any | null = null;

  reset(): void {
    this.returnValueForCreate = null;
    this.throwErrorForCreate = null;
    this.returnValueForUpdate = null;
    this.throwErrorForUpdate = null;
  }
  async createFromMagic(
    ctx: Context,
    didToken: string,
    name: string,
  ): Promise<User> {
    if (this.throwErrorForCreate) throw this.throwErrorForCreate;
    if (!this.returnValueForCreate) throw Error("setup error");
    return this.returnValueForCreate;
  }

  async createFromFirebase(
    ctx: Context,
    idToken: string,
    name: string,
  ): Promise<User> {
    if (this.throwErrorForCreate) throw this.throwErrorForCreate;
    if (!this.returnValueForCreate) throw Error("setup error");
    return this.returnValueForCreate;
  }

  async update(
    ctx: Context,
    name: string,
    iconType: IconType,
    iconSubCategory: string,
    titleSubCategory: string,
    frameSubCategory: string,
  ): Promise<User> {
    if (this.throwErrorForUpdate) throw this.throwErrorForUpdate;
    if (!this.returnValueForUpdate) throw Error("setup error");
    return this.returnValueForUpdate;
  }
}
