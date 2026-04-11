-- Fase 6: columna legada Bot.sourceApp + dominio Finanzas (FinancialAccount, Transaction).

ALTER TABLE "Bot" ADD COLUMN IF NOT EXISTS "sourceApp" TEXT;

DO $$
BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('INGRESO', 'EGRESO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE "FinancialAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'CLP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialAccount_userId_key" ON "FinancialAccount"("userId");

ALTER TABLE "FinancialAccount"
  ADD CONSTRAINT "FinancialAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CLP',
  "type" "TransactionType" NOT NULL,
  "concept" TEXT NOT NULL,
  "status" "TransactionStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
