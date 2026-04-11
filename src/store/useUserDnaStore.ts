'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppPreferences, CoreProfile, FractalDNA, UserIdentity } from '@/types/user-dna';

const STORAGE_KEY = 'FIFER_USER_DNA_STORAGE';

const initialFractalDNA: FractalDNA = {
  arquitectura: {
    alertasDOM: true,
    comunaPrincipal: 'Chicureo',
  },
  bots: {
    optimizarCostos: true,
    tonoPorDefecto: 'Profesional',
  },
};

const initialIdentity: UserIdentity = {
  name: 'Cristobal Kupfer',
  nombres: 'Cristobal',
  apellidoPaterno: 'Kupfer',
  apellidoMaterno: '',
  nacionalidad: 'Chilena',
  fechaNacimiento: '1990-04-15',
  tier: 'pro',
  role: 'admin',
  fractalDNA: initialFractalDNA,
};

function toCoreProfile(identity: Pick<UserIdentity, keyof CoreProfile>): CoreProfile {
  const fallbackName = `${identity.nombres} ${identity.apellidoPaterno}`.trim();
  return {
    name: identity.name?.trim() || fallbackName || undefined,
    nombres: identity.nombres,
    apellidoPaterno: identity.apellidoPaterno,
    apellidoMaterno: identity.apellidoMaterno,
    nacionalidad: identity.nacionalidad,
    fechaNacimiento: identity.fechaNacimiento,
    tier: identity.tier,
    role: identity.role,
  };
}

type UserDnaStore = UserIdentity & {
  coreProfile: CoreProfile;
  updateCoreProfile: (data: Partial<CoreProfile>) => void;
  updateAppPreferences: (moduleId: string, data: AppPreferences) => void;
  getAppPreferences: (moduleId: string) => AppPreferences;
};

/** Estado ADN Fractal (v6.0), persistido en `localStorage` (`FIFER_USER_DNA_STORAGE`). */
export const useUserDnaStore = create<UserDnaStore>()(
  persist(
    (set, get) => ({
      ...initialIdentity,
      coreProfile: toCoreProfile(initialIdentity),
      updateCoreProfile: (data) =>
        set((state) => {
          const next = { ...state, ...data };
          return {
            ...next,
            coreProfile: toCoreProfile(next),
          };
        }),
      updateAppPreferences: (moduleId, data) =>
        set((state) => ({
          fractalDNA: {
            ...state.fractalDNA,
            [moduleId]: {
              ...(state.fractalDNA[moduleId] ?? {}),
              ...data,
            },
          },
        })),
      /** Copia defensiva (no usar como selector de Zustand: nueva referencia en cada lectura). */
      getAppPreferences: (moduleId) => {
        const prefs = get().fractalDNA[moduleId];
        return prefs ? { ...prefs } : {};
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<UserDnaStore>;
        const merged = { ...current, ...p } as UserDnaStore;
        merged.coreProfile = toCoreProfile(merged);
        return merged;
      },
      partialize: (state) => ({
        name: state.name,
        nombres: state.nombres,
        apellidoPaterno: state.apellidoPaterno,
        apellidoMaterno: state.apellidoMaterno,
        nacionalidad: state.nacionalidad,
        fechaNacimiento: state.fechaNacimiento,
        tier: state.tier,
        role: state.role,
        fractalDNA: state.fractalDNA,
        coreProfile: state.coreProfile,
      }),
    },
  ),
);

// --- Legacy v5: lectura de `_xray_USER_DNA.md` (no reactivar) ---
// TODO (v6.0): Reemplazado por useUserDnaStore. El ADN ahora se inyecta por módulo.
// import fs from 'node:fs';
// import path from 'node:path';
// const userDnaPath = path.join(process.cwd(), 'FIFER_CORE', 'xray_engines', '_xray_USER_DNA.md');
// const userDnaMarkdown = fs.readFileSync(userDnaPath, 'utf8');
// const userDnaMarkdown = await fetch('/ruta/a/_xray_USER_DNA.md').then((r) => r.text());
