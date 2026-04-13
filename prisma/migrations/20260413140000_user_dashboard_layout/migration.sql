-- Persistencia del layout del dashboard (celdas + orden + widgets líquidos).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dashboardLayout" JSONB;
