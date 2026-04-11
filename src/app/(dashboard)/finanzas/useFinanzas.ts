'use client';

import { useCallback, useEffect, useState } from 'react';

import type { TransaccionInput } from '@/types/schemas';

export type FinanzasAccountJson = {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanzasTransactionJson = {
  id: string;
  accountId: string;
  amount: string;
  currency: string;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
  status: 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO';
  createdAt: string;
  updatedAt: string;
};

export type FinanzasGetResponse = {
  account: FinanzasAccountJson;
  transactions: FinanzasTransactionJson[];
};

export type FinanzasPostResponse = {
  transaction: FinanzasTransactionJson;
  balance: string;
  currency: string;
};

export function useFinanzas() {
  const [data, setData] = useState<FinanzasGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanzas = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/finanzas', { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        setError('No autenticado');
        setData(null);
        return;
      }
      if (!res.ok) {
        setError('No se pudieron cargar los datos financieros');
        setData(null);
        return;
      }
      const json = (await res.json()) as FinanzasGetResponse;
      setData(json);
    } catch {
      setError('Error de red');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFinanzas();
  }, [fetchFinanzas]);

  const crearTransaccion = useCallback(
    async (payload: TransaccionInput): Promise<{ ok: true; body: FinanzasPostResponse } | { ok: false; message: string }> => {
      try {
        const res = await fetch('/api/v1/finanzas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (res.status === 401) {
          return { ok: false, message: 'Sesión expirada' };
        }
        if (res.status === 422) {
          return { ok: false, message: json.error ?? 'Datos inválidos' };
        }
        if (!res.ok) {
          return { ok: false, message: json.error ?? 'No se pudo registrar el movimiento' };
        }
        return { ok: true, body: json as FinanzasPostResponse };
      } catch {
        return { ok: false, message: 'Error de red' };
      }
    },
    [],
  );

  return {
    account: data?.account ?? null,
    transactions: data?.transactions ?? [],
    loading,
    error,
    refetch: fetchFinanzas,
    crearTransaccion,
  };
}
