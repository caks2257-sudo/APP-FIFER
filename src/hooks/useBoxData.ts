'use client';

import { useEffect, useRef, useState } from 'react';
import { boxCircuitBreaker } from '@/utils/box-circuit-breaker';

function payloadEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export type UseBoxDataResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Hidratación segura: la petición vive solo en `useEffect` con dependencias `[boxId]`.
 * `fetcher` se lee vía ref para no incluir su identidad en el array (evita bucles).
 * Para repetir la carga (p. ej. tras `boxCircuitBreaker.reset`), remonta el consumidor con `key`.
 */
export function useBoxData<T>(boxId: string, fetcher: () => Promise<T>): UseBoxDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        setData((prev) => (prev !== null && payloadEquals(prev, result) ? prev : (result as T)));
      } catch (e) {
        boxCircuitBreaker.recordFailure(boxId);
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boxId]);

  return { data, isLoading, error };
}
