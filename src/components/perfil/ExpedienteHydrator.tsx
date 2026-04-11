'use client';

import { useEffect } from 'react';

import { useUserDnaStore } from '@/store/useUserDnaStore';

/** Tras hidratar Zustand desde `localStorage`, sincroniza expediente y tier/role desde Prisma vía `/api/v1/perfil`. */
export default function ExpedienteHydrator() {
  const hydrateExpedienteFromApi = useUserDnaStore((s) => s.hydrateExpedienteFromApi);

  useEffect(() => {
    const run = () => {
      void hydrateExpedienteFromApi();
    };
    if (useUserDnaStore.persist.hasHydrated()) {
      run();
    }
    return useUserDnaStore.persist.onFinishHydration(run);
  }, [hydrateExpedienteFromApi]);

  return null;
}
