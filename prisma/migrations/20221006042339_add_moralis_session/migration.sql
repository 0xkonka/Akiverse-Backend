-- CreateTable
CREATE TABLE "moralis_sessions" (
    "challenge_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "version" TEXT,
    "nonce" TEXT,
    "wallet_address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moralis_sessions_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moralis_sessions_token_hash_key" ON "moralis_sessions"("token_hash");
