import {
  CLAIM_VERSION,
  createCustomToken,
  createFirebaseUser,
  getFirebaseUserByEmail,
  setUserClaims,
} from "../../src/helpers/firebase_auth";
import { getAuth } from "../../src/helpers/firebase";
import prisma from "../../src/prisma";
import { createMockContextNonAuth } from "../mock/context";
import { eraseDatabase } from "../test_helper";
import { SameEmailUserExistsUseCaseError } from "../../src/use_cases/errors";

async function deleteAllUsers() {
  const users = await getAuth().listUsers();
  await getAuth().deleteUsers(users.users.map((v) => v.uid));
}
describe("createCustomToken", () => {
  afterAll(async () => {
    await deleteAllUsers();
  });
  test("success", async () => {
    const uid = await createFirebaseUser("dummy@akiverse.io");
    const token = await createCustomToken(uid);
    expect(token.length).toBeGreaterThan(1);
  });
});

describe("setUserClaims", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  afterAll(async () => {
    await deleteAllUsers();
  });
  test("success", async () => {
    const email = "claim_test@akiverse.io";
    const targetUser = await createFirebaseUser(email);
    let user = await getAuth().getUser(targetUser);
    expect(user.customClaims).toBeUndefined();

    const dbUser = await prisma.user.create({
      data: {
        email: email,
        name: "claim test",
        walletAddress: "dummy_wallet",
      },
    });
    await setUserClaims(createMockContextNonAuth(), dbUser.id, user.uid);
    user = await getAuth().getUser(targetUser);
    expect(user.customClaims).not.toBeUndefined();
    expect(user.customClaims).toMatchObject({
      version: CLAIM_VERSION,
      admin: false,
      akiverseId: dbUser.id,
      walletAddress: "dummy_wallet",
      locked: false,
    });
  });
});

describe("createFirebaseUser", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  afterAll(async () => {
    await deleteAllUsers();
  });
  test("success", async () => {
    const email = "create_user@akiverse.io";
    const firebaseUid = await createFirebaseUser(email);
    expect(firebaseUid.length).toBeGreaterThan(0);
    const fUser = await getFirebaseUserByEmail(email);
    expect(fUser).not.toBeUndefined();
    expect(fUser!.uid).toEqual(firebaseUid);

    // 重複エラーチェック
    await expect(createFirebaseUser(email)).rejects.toThrow(
      SameEmailUserExistsUseCaseError,
    );
  });
});

describe("getFirebaseUserByEmail", () => {
  afterAll(async () => {
    await deleteAllUsers();
  });
  test("success", async () => {
    const email = "exist@akiverse.io";
    const uid = await createFirebaseUser(email);
    const user = await getFirebaseUserByEmail(email);
    expect(user!.uid).toEqual(uid);
  });
  test("not found", async () => {
    const email = "no_user@akiverse.io";
    const user = await getFirebaseUserByEmail(email);
    expect(user).toBeUndefined();
  });
});
