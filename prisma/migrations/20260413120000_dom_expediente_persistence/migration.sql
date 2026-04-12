-- Fase 25: borradores DOM (`DomExpediente`).

CREATE TABLE "DomExpediente" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "projectData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "mainApp" TEXT NOT NULL DEFAULT 'dom',
    "subApp" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomExpediente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DomExpediente_userId_idx" ON "DomExpediente"("userId");

ALTER TABLE "DomExpediente" ADD CONSTRAINT "DomExpediente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
