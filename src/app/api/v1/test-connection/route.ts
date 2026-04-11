import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';

/**
 * Prueba de integración: lectura mínima vía cliente Supabase (anon + RLS).
 */
export async function GET() {
  const { data, error } = await supabase.from('User').select('*').limit(1);

  return NextResponse.json(
    {
      ok: !error,
      data,
      error: error
        ? { message: error.message, code: error.code, details: error.details }
        : null,
    },
    { status: error ? 502 : 200 },
  );
}
