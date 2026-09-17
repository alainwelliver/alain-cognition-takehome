-- CreateTable
CREATE TABLE "refunds_transactions" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "charged_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds_refunds" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "reason_code" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds_provider_calls" (
    "id" SERIAL NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_provider_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refunds_approval_id_key" ON "refunds_refunds"("approval_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_calls_idempotency_key_key" ON "refunds_provider_calls"("idempotency_key");

-- AddForeignKey
ALTER TABLE "refunds_refunds" ADD CONSTRAINT "refunds_refunds_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "refunds_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Least-privilege grants for the application role. Refund and provider-call
-- rows are written by the approval executor and never removed by the app.
GRANT SELECT ON "refunds_transactions" TO app_user;
GRANT SELECT, INSERT ON "refunds_refunds", "refunds_provider_calls" TO app_user;
GRANT USAGE, SELECT ON SEQUENCE "refunds_provider_calls_id_seq" TO app_user;
