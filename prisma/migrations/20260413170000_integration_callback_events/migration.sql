-- Webhooks agnósticos: Tasklet / Fintoc / Make → registro previo a procesamiento
CREATE TABLE "integration_callback_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "request_path" TEXT NOT NULL,
    "query_json" JSONB,
    "headers_json" JSONB NOT NULL,
    "body_json" JSONB,
    "body_text" TEXT,
    "client_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_callback_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_callback_events_provider_created_at_idx" ON "integration_callback_events"("provider", "created_at");
