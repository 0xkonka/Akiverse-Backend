import { AuthChecker } from "type-graphql";
import { Context } from "vm";
import {
  AuthenticationError,
  UserLockedError,
} from "../../src/apps/server/auth";

export const authChecker: AuthChecker<Context> = () => {
  return true;
};

export const authFailChecker: AuthChecker<Context> = () => {
  throw new AuthenticationError("user not authenticated");
};

export const userLockedChecker: AuthChecker<Context> = () => {
  throw new UserLockedError("user locked");
};
