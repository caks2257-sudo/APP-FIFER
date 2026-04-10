-- PostgREST / Data API: permisos para roles Supabase cuando `fifer_platform` está en "Exposed schemas".
-- Idempotente: GRANT y ALTER DEFAULT PRIVILEGES son seguros de repetir.
GRANT USAGE ON SCHEMA fifer_platform TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA fifer_platform TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA fifer_platform TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fifer_platform TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fifer_platform GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fifer_platform GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fifer_platform GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
