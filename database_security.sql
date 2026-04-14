-- =============================================================================
-- FIFER — Row Level Security (RLS) para Supabase / PostgreSQL
-- =============================================================================
-- Origen: alineado con prisma/schema.prisma y tipos en src/types/supabase-database.ts
--
-- IMPORTANTE (identidad Supabase Auth vs Prisma):
--   Supabase expone auth.uid() como UUID. En este esquema, User.id y las FK
--   ownerId/userId son String (cuid). Las políticas comparan con auth.uid()::text.
--   Debe existir correspondencia 1:1 entre auth.users.id y public."User".id
--   (mismo valor en texto). Si usáis solo cuid sin enlazar a Auth, ajustad estas
--   condiciones (p. ej. tabla de mapeo o claims JWT).
--
-- Rol service_role: en Supabase bypassa RLS; úsalo solo en servidor (API routes).
-- Rol authenticated: usuarios con sesión JWT.
-- Rol anon: sin sesión (políticas restrictivas salvo donde se indique).
--
-- Ejecución: aplicar en SQL Editor de Supabase o vía migración. Revisar nombres
-- de tablas en la base real (\dt en psql) si migraste con nombres distintos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Función auxiliar: administrador FIFER (rol en columna "User".role = 'admin')
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fifer_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "User" u
    WHERE u.id = (auth.uid())::text
      AND u.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.fifer_is_admin() IS
  'True si el usuario autenticado existe en public."User" con role = admin.';

-- =============================================================================
-- "User" — identidad central
-- =============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_self_or_admin" ON "User";
CREATE POLICY "user_select_self_or_admin"
  ON "User"
  FOR SELECT
  TO authenticated
  USING (id = (auth.uid())::text OR public.fifer_is_admin());

DROP POLICY IF EXISTS "user_update_self_or_admin" ON "User";
CREATE POLICY "user_update_self_or_admin"
  ON "User"
  FOR UPDATE
  TO authenticated
  USING (id = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK (id = (auth.uid())::text OR public.fifer_is_admin());

-- Alta de fila propia (registro controlado por la app); administradores pueden insertar.
DROP POLICY IF EXISTS "user_insert_self_or_admin" ON "User";
CREATE POLICY "user_insert_self_or_admin"
  ON "User"
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (auth.uid())::text OR public.fifer_is_admin());

-- Borrado: solo admin (evita que un usuario borre su fila sin lógica de negocio).
DROP POLICY IF EXISTS "user_delete_admin" ON "User";
CREATE POLICY "user_delete_admin"
  ON "User"
  FOR DELETE
  TO authenticated
  USING (public.fifer_is_admin());

COMMENT ON POLICY "user_select_self_or_admin" ON "User" IS
  'Lectura: propio usuario o administrador FIFER.';

-- =============================================================================
-- "Expediente" — 1:1 con User (userId)
-- =============================================================================
ALTER TABLE "Expediente" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expediente_all_owner" ON "Expediente";
CREATE POLICY "expediente_all_owner"
  ON "Expediente"
  FOR ALL
  TO authenticated
  USING ("userId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("userId" = (auth.uid())::text OR public.fifer_is_admin());

COMMENT ON POLICY "expediente_all_owner" ON "Expediente" IS
  'CRUD restringido al dueño (userId) o admin.';

-- =============================================================================
-- "DomExpediente" — borradores DOM (userId)
-- =============================================================================
ALTER TABLE "DomExpediente" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dom_expediente_all_owner" ON "DomExpediente";
CREATE POLICY "dom_expediente_all_owner"
  ON "DomExpediente"
  FOR ALL
  TO authenticated
  USING ("userId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("userId" = (auth.uid())::text OR public.fifer_is_admin());

-- =============================================================================
-- "FinancialAccount" — 1:1 con User (userId)
-- =============================================================================
ALTER TABLE "FinancialAccount" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_account_all_owner" ON "FinancialAccount";
CREATE POLICY "financial_account_all_owner"
  ON "FinancialAccount"
  FOR ALL
  TO authenticated
  USING ("userId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("userId" = (auth.uid())::text OR public.fifer_is_admin());

-- =============================================================================
-- "Transaction" — vía cuenta financiera (accountId -> FinancialAccount.userId)
-- =============================================================================
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transaction_all_via_account" ON "Transaction";
CREATE POLICY "transaction_all_via_account"
  ON "Transaction"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "FinancialAccount" fa
      WHERE fa.id = "Transaction"."accountId"
        AND fa."userId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "FinancialAccount" fa
      WHERE fa.id = "Transaction"."accountId"
        AND fa."userId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  );

COMMENT ON POLICY "transaction_all_via_account" ON "Transaction" IS
  'Solo el dueño de la cuenta financiera asociada (o admin) puede operar movimientos.';

-- =============================================================================
-- "InternalApiKey" — llaves por ownerId
-- =============================================================================
ALTER TABLE "InternalApiKey" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internal_api_key_all_owner" ON "InternalApiKey";
CREATE POLICY "internal_api_key_all_owner"
  ON "InternalApiKey"
  FOR ALL
  TO authenticated
  USING ("ownerId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("ownerId" = (auth.uid())::text OR public.fifer_is_admin());

-- =============================================================================
-- "Bot" — ownerId
-- =============================================================================
ALTER TABLE "Bot" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_all_owner" ON "Bot";
CREATE POLICY "bot_all_owner"
  ON "Bot"
  FOR ALL
  TO authenticated
  USING ("ownerId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("ownerId" = (auth.uid())::text OR public.fifer_is_admin());

-- =============================================================================
-- "Contract" — ownerId
-- =============================================================================
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_all_owner" ON "Contract";
CREATE POLICY "contract_all_owner"
  ON "Contract"
  FOR ALL
  TO authenticated
  USING ("ownerId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("ownerId" = (auth.uid())::text OR public.fifer_is_admin());

-- =============================================================================
-- "Document" — ownerId
-- =============================================================================
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_all_owner" ON "Document";
CREATE POLICY "document_all_owner"
  ON "Document"
  FOR ALL
  TO authenticated
  USING ("ownerId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("ownerId" = (auth.uid())::text OR public.fifer_is_admin());

-- =============================================================================
-- AODS — sesión por ownerId; hijos por sessionId
-- =============================================================================

ALTER TABLE "AodsSession" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aods_session_all_owner" ON "AodsSession";
CREATE POLICY "aods_session_all_owner"
  ON "AodsSession"
  FOR ALL
  TO authenticated
  USING ("ownerId" = (auth.uid())::text OR public.fifer_is_admin())
  WITH CHECK ("ownerId" = (auth.uid())::text OR public.fifer_is_admin());

ALTER TABLE "AodsDocument" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aods_document_all_via_session" ON "AodsDocument";
CREATE POLICY "aods_document_all_via_session"
  ON "AodsDocument"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AodsSession" s
      WHERE s.id = "AodsDocument"."sessionId"
        AND s."ownerId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "AodsSession" s
      WHERE s.id = "AodsDocument"."sessionId"
        AND s."ownerId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  );

ALTER TABLE "AodsMessage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aods_message_all_via_session" ON "AodsMessage";
CREATE POLICY "aods_message_all_via_session"
  ON "AodsMessage"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AodsSession" s
      WHERE s.id = "AodsMessage"."sessionId"
        AND s."ownerId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "AodsSession" s
      WHERE s.id = "AodsMessage"."sessionId"
        AND s."ownerId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  );

ALTER TABLE "AodsState" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aods_state_all_via_session" ON "AodsState";
CREATE POLICY "aods_state_all_via_session"
  ON "AodsState"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AodsSession" s
      WHERE s.id = "AodsState"."sessionId"
        AND s."ownerId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "AodsSession" s
      WHERE s.id = "AodsState"."sessionId"
        AND s."ownerId" = (auth.uid())::text
    )
    OR public.fifer_is_admin()
  );

-- =============================================================================
-- integration_callback_events — auditoría de webhooks (sin owner en esquema)
-- =============================================================================
-- No hay userId/ownerId: acceso desde cliente casi nunca debe ser público.
-- Solo administradores FIFER pueden leer; escritura típica vía service_role (API).

ALTER TABLE integration_callback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_events_select_admin" ON integration_callback_events;
CREATE POLICY "integration_events_select_admin"
  ON integration_callback_events
  FOR SELECT
  TO authenticated
  USING (public.fifer_is_admin());

DROP POLICY IF EXISTS "integration_events_modify_admin" ON integration_callback_events;
CREATE POLICY "integration_events_modify_admin"
  ON integration_callback_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.fifer_is_admin());

DROP POLICY IF EXISTS "integration_events_update_admin" ON integration_callback_events;
CREATE POLICY "integration_events_update_admin"
  ON integration_callback_events
  FOR UPDATE
  TO authenticated
  USING (public.fifer_is_admin())
  WITH CHECK (public.fifer_is_admin());

DROP POLICY IF EXISTS "integration_events_delete_admin" ON integration_callback_events;
CREATE POLICY "integration_events_delete_admin"
  ON integration_callback_events
  FOR DELETE
  TO authenticated
  USING (public.fifer_is_admin());

COMMENT ON POLICY "integration_events_select_admin" ON integration_callback_events IS
  'Lectura solo admin; ingesta webhook desde backend con service_role (bypass RLS).';

-- =============================================================================
-- Fin — revisar GRANTs de esquema public para roles authenticated/anon según
--       política de producto (Supabase por defecto suele otorgar USAGE + SELECT).
-- =============================================================================
