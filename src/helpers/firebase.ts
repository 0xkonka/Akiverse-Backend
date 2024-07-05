import {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
} from "../constants";
import admin, { auth } from "firebase-admin";

if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  // Emulatorで実行時はこっちに入る
  admin.initializeApp({
    projectId: "akiverse-app-local",
  });
} else {
  const cert = {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };

  admin.initializeApp({
    credential: admin.credential.cert(cert),
  });
}

export function getAuth() {
  return auth();
}
