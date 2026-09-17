-- CreateTable
CREATE TABLE "flags" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dev" BOOLEAN NOT NULL DEFAULT false,
    "staging" BOOLEAN NOT NULL DEFAULT false,
    "prod" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flags_pkey" PRIMARY KEY ("key")
);

GRANT SELECT, INSERT, UPDATE, DELETE ON "flags" TO app_user;
