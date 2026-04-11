'use client';
// SRE: touch para forzar recompilación del segmento /dom/normativa
// Este archivo no usa notFound(). Si ves 404 en /dom/normativa, no viene de este
// componente: suele ser Next sin ruta compilada, middleware, o URL incorrecta. Ver logs [NORMATIVA DEBUG] en dev.

import { useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase-ssr/browser';

import AnalisisTerrenoForm from './AnalisisTerrenoForm';
import ReporteFactibilidad from './ReporteFactibilidad';
import type { DomAnalisisRequest, DomAnalisisResponse } from '@/types/schemas';

export default function NormativaPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomAnalisisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      console.log('[NORMATIVA DEBUG] Supabase sesión (auth.getUser)', {
        supabaseUserId: authUser?.id ?? null,
        email: authUser?.email ?? null,
        authError: authError?.message ?? null,
      });

      const res = await fetch('/api/v1/perfil', {
        credentials: 'include',
        cache: 'no-store',
      });
      const perfilJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      console.log('[NORMATIVA DEBUG] Prisma vía GET /api/v1/perfil', {
        httpStatus: res.status,
        prismaUserFromApi: perfilJson.user ?? null,
        expedientePresente: Boolean(perfilJson.expediente),
        errorBody: typeof perfilJson.error === 'string' ? perfilJson.error : null,
      });

      if (res.status === 404) {
        console.warn(
          '[NORMATIVA DEBUG] La API /api/v1/perfil devolvió 404 (sin fila User en Prisma para el email de sesión). Eso no es el mismo “404” que la página Next si la ruta no existe.',
        );
      }
      if (res.ok && perfilJson.user && typeof perfilJson.user === 'object') {
        const u = perfilJson.user as { tier?: string; role?: string };
        console.log('[NORMATIVA DEBUG] Tier/rol (no bloquean esta ruta en page.tsx)', {
          tier: u.tier ?? null,
          role: u.role ?? null,
        });
      }
    })();
  }, []);

  const handleAnalisis = async (data: DomAnalisisRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/v1/dom/analisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: unknown;
        factible?: boolean;
        superficieMaximaEdificable?: number;
        observaciones?: string | string[];
      };

      if (res.status === 401) {
        setError('Sesión expirada. Inicie sesión de nuevo.');
        return;
      }
      if (res.status === 422) {
        setError(typeof json.error === 'string' ? json.error : 'Datos inválidos');
        return;
      }
      if (!res.ok) {
        setError(
          typeof json.error === 'string'
            ? json.error
            : 'No se pudo completar el análisis normativo.',
        );
        return;
      }

      if (
        typeof json.factible === 'boolean' &&
        typeof json.superficieMaximaEdificable === 'number' &&
        (typeof json.observaciones === 'string' || Array.isArray(json.observaciones))
      ) {
        setResult({
          factible: json.factible,
          superficieMaximaEdificable: json.superficieMaximaEdificable,
          observaciones: json.observaciones,
        });
      } else {
        setError('Respuesta del servidor en formato inesperado.');
      }
    } catch {
      setError('Error de red al contactar el motor de análisis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-8 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">
          Normativa OGUC / LGUC (DOM)
        </h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Análisis paramétrico orientativo con motor IA en cascada (referencia normativa; no sustituye
          informe de arquitecto ni revisión municipal).
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <AnalisisTerrenoForm onSubmit={handleAnalisis} loading={loading} />
        <ReporteFactibilidad result={result} error={error} />
      </div>
    </div>
  );
}
