'use client';

import { useEffect } from 'react';
import { useUserDnaStore } from '@/store/useUserDnaStore';

const EXPECTED_DISPLAY_NAME = 'Cristobal Kupfer Silva';

/** Temporal: fuerza re-hidratación si el perfil persistido no coincide con el de desarrollo. */
export default function DevDnaStorageMigration() {
  useEffect(() => {
    const run = () => {
      const name = useUserDnaStore.getState().coreProfile.name;
      if (name !== EXPECTED_DISPLAY_NAME) {
        localStorage.clear();
        window.location.reload();
      }
    };
    const unsub = useUserDnaStore.persist.onFinishHydration(run);
    if (useUserDnaStore.persist.hasHydrated()) {
      run();
    }
    return unsub;
  }, []);

  return null;
}
