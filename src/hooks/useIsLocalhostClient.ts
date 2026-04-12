'use client';

import { useEffect, useState } from 'react';

/**
 * true solo en el navegador cuando el host es localhost o 127.0.0.1 (§14 soberanía de edición).
 */
export function useIsLocalhostClient(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const h = window.location.hostname;
    setV(h === 'localhost' || h === '127.0.0.1');
  }, []);
  return v;
}
