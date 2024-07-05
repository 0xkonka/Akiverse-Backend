import "reflect-metadata"; // needed to import type-graphql generated code

import Web3 from "web3";
import { GraphQLSchema, graphql } from "graphql";

import prisma from "../../src/prisma";
import { buildSchema } from "type-graphql";
import CustomResolvers from "../../src/apps/server/apis/resolvers";
import { eraseDatabase } from "../test_helper";
import { authChecker } from "../../src/apps/server/auth";
import { Context, ContextImpl } from "../../src/context";
import { User } from "@prisma/client";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../src/apps/server/resolvers";
import { Container } from "typedi";
import { WalletAddressUseCaseImpl } from "../../src/use_cases/wallet_address_usecase";
import { QuestProgressChecker } from "../../src/helpers/quests";

const useCase = new WalletAddressUseCaseImpl(new QuestProgressChecker());
Container.set("walletAddress.useCase", useCase);
async function getChallenge(
  ctx: Context,
  schema: GraphQLSchema,
  walletAddress: string,
): Promise<any> {
  const source = `mutation M($walletAddress: String!) {
    RequestWeb3Challenge(input: {
      walletAddress: $walletAddress, chain: "0x89"
    }) {
      sessionToken, message
    }
  }`;
  const variableValues = { walletAddress };
  const contextValue = ctx;
  const challengeResult = await graphql({
    schema,
    source,
    variableValues,
    contextValue,
  });
  return challengeResult?.data;
}

async function registerWalletAddress(
  ctx: Context,
  schema: GraphQLSchema,
  message: string,
  signature: string,
): Promise<any> {
  const source = `mutation M($message: String!, $signature: String!) {
    registerWalletAddress(input: {
      message: $message, signature: $signature
    }) {
      user {
        id
        name
        email
        walletAddress
      }
    }
    }`;
  const variableValues = { message, signature };
  const contextValue = ctx;
  const verifyResult = await graphql({
    schema,
    source,
    variableValues,
    contextValue,
  });
  return verifyResult;
}

function createContext(user?: User): Context {
  const ctx = new ContextImpl(prisma);
  if (user) {
    ctx.accessToken = {
      tokenUse: "api",
      userId: user.id,
      walletAddress: user.walletAddress || undefined,
      locked: false,
    };
  }
  return ctx;
}

describe("register wallet address", () => {
  // create wallet
  const web3 = new Web3();
  const account = web3.eth.accounts.create();
  const walletAddress = account.address;
  const privateKey = account.privateKey;
  // create another wallet
  const wrongAccount = web3.eth.accounts.create();
  const wrongPrivateKey = wrongAccount.privateKey;

  // Prepare API
  const schema = buildSchemaSync({
    resolvers: [...GeneratedResolvers, ...CustomResolvers],
    container: Container,
    authChecker: authChecker,
  });

  beforeEach(eraseDatabase);

  it("should be able to register wallet address", async () => {
    // create user without wallet address
    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@vict.sg" },
    });
    // create mail login session
    const ctx = createContext(user);
    // Prepare API
    const schema = await buildSchema({
      resolvers: [...GeneratedResolvers, ...CustomResolvers],
      container: Container,
      authChecker: authChecker,
    });
    // get challenge
    const challengeResult = await getChallenge(ctx, schema, walletAddress);
    const { message } = challengeResult.RequestWeb3Challenge;
    // Sign message
    const signature = web3.eth.accounts.sign(message, privateKey).signature;
    const registerWalletAddressResult = await registerWalletAddress(
      ctx,
      schema,
      message,
      signature,
    );
    expect(registerWalletAddressResult.error).toBeUndefined();
    expect(registerWalletAddressResult.data).toEqual({
      registerWalletAddress: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: walletAddress,
        },
      },
    });
  });

  test("should fail to register wallet address with incorrect key", async () => {
    // create user without wallet address
    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@vict.sg" },
    });
    // create mail login session
    const ctx = createContext(user);

    // get challenge
    const challengeResult = await getChallenge(ctx, schema, walletAddress);
    const { message } = challengeResult.RequestWeb3Challenge;
    // Sign message
    const signature = web3.eth.accounts.sign(
      message,
      wrongPrivateKey,
    ).signature;
    const registerWalletAddressResult = await registerWalletAddress(
      ctx,
      schema,
      message,
      signature,
    );
    expect(registerWalletAddressResult.errors.length).toEqual(1);
  });

  test("should fail to register wallet address with not authorized", async () => {
    // No login context
    const ctx = new ContextImpl(prisma);

    // get challenge
    const challengeResult = await getChallenge(ctx, schema, walletAddress);
    const { message } = challengeResult.RequestWeb3Challenge;
    // Sign message
    const signature = web3.eth.accounts.sign(message, privateKey).signature;
    const registerWalletAddressResult = await registerWalletAddress(
      ctx,
      schema,
      message,
      signature,
    );
    expect(registerWalletAddressResult.errors.length).toEqual(1);
    expect(registerWalletAddressResult.errors[0].extensions.code).toBe(
      "UNAUTHENTICATED",
    );
  });

  test("should fail to register wallet address with same wallet address user exist", async () => {
    // create user without wallet address
    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@vict.sg" },
    });
    // create mail login session
    const ctx = createContext(user);

    // get challenge
    const challengeResult = await getChallenge(ctx, schema, walletAddress);

    // same wallet address user creat
    await prisma.user.create({
      data: {
        name: "same address user",
        email: "same.address@user",
        walletAddress: walletAddress,
      },
    });

    const { message } = challengeResult.RequestWeb3Challenge;
    // Sign message
    const signature = web3.eth.accounts.sign(message, privateKey).signature;
    const registerWalletAddressResult = await registerWalletAddress(
      ctx,
      schema,
      message,
      signature,
    );
    expect(registerWalletAddressResult.errors.length).toEqual(1);
    expect(registerWalletAddressResult.errors[0].extensions.code).toBe(
      "INVALID_ARGUMENT",
    );
  });

  test("should fail to register wallet address with wallet address already registered", async () => {
    // create user with wallet address
    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@vict.sg", walletAddress },
    });
    // create mail login session
    const ctx = createContext(user);

    // get challenge
    const challengeResult = await getChallenge(ctx, schema, walletAddress);

    const { message } = challengeResult.RequestWeb3Challenge;
    // Sign message
    const signature = web3.eth.accounts.sign(message, privateKey).signature;
    const registerWalletAddressResult = await registerWalletAddress(
      ctx,
      schema,
      message,
      signature,
    );
    expect(registerWalletAddressResult.errors.length).toEqual(1);
    expect(registerWalletAddressResult.errors[0].extensions.code).toBe(
      "ILLEGAL_STATE",
    );
  });

  test("should fail to register wallet address with operation conflict", async () => {
    // create user without wallet address
    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@vict.sg" },
    });
    // create mail login session
    const ctx = createContext(user);

    // mocking
    const orgMethod = ctx.prisma.user.findUnique;
    (ctx.prisma.user.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args: any) => {
        const ret = await orgMethod(args);
        // update user
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { walletAddress: walletAddress },
        });

        return ret;
      });

    // get challenge
    const challengeResult = await getChallenge(ctx, schema, walletAddress);

    const { message } = challengeResult.RequestWeb3Challenge;

    // Sign message
    const signature = web3.eth.accounts.sign(message, privateKey).signature;
    const registerWalletAddressResult = await registerWalletAddress(
      ctx,
      schema,
      message,
      signature,
    );
    console.log(registerWalletAddressResult);
    expect(registerWalletAddressResult.errors.length).toEqual(1);
    expect(registerWalletAddressResult.errors[0].extensions.code).toBe(
      "CONFLICT",
    );
    ctx.prisma.user.findUnique = orgMethod;
  });
});
