-- CreateTable
CREATE TABLE "magic_sessions" (
    "issuer" TEXT NOT NULL,
    "user_id" UUID,
    "last_login_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magic_sessions_pkey" PRIMARY KEY ("issuer")
);

-- AddForeignKey
ALTER TABLE "magic_sessions" ADD CONSTRAINT "magic_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
