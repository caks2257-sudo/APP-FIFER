-- Tabla de API Keys
CREATE TABLE public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('app', 'engine')),
    owner_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Índice para búsquedas rápidas en el Gateway
CREATE INDEX idx_api_keys_key ON public.api_keys(key);

-- Tabla de API Logs para trazabilidad del Gateway
CREATE TABLE public.api_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    status INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para analítica de consumo
CREATE INDEX idx_api_logs_key_id ON public.api_logs(key_id);
CREATE INDEX idx_api_logs_timestamp ON public.api_logs(timestamp);

-- Políticas de Seguridad (RLS) base
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Solo el rol de servicio (backend) puede leer/escribir keys y logs
CREATE POLICY "Service role full access api_keys" ON public.api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access api_logs" ON public.api_logs FOR ALL USING (auth.role() = 'service_role');
