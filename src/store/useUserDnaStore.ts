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
  nombres: 'Cristobal',
  apellidoPaterno: 'Kupfer',
  apellidoMaterno: 'Silva',
  nacionalidad: 'Chilena',
  fechaNacimiento: '1990-04-15',
  rut: '12.345.678-5',
  tier: 'pro',
  role: 'admin',
  fractalDNA: initialFractalDNA,
};

function toCoreProfile(identity: Pick<UserIdentity, keyof CoreProfile>): CoreProfile {
  const parts = [
    identity.nombres?.trim(),
    identity.apellidoPaterno?.trim(),
    identity.apellidoMaterno?.trim(),
  ].filter(Boolean);
  const displayFromParts = parts.join(' ').trim();
  return {
    name: displayFromParts || identity.name?.trim() || undefined,
    nombres: identity.nombres,
    apellidoPaterno: identity.apellidoPaterno,
    apellidoMaterno: identity.apellidoMaterno,
    nacionalidad: identity.nacionalidad,
    fechaNacimiento: identity.fechaNacimiento,
    rut: identity.rut ?? '',
    tier: identity.tier,
    role: identity.role,
  };
}

type UserDnaStore = UserIdentity & {
  coreProfile: CoreProfile;
  updateCoreProfile: (data: Partial<CoreProfile>) => void;
  hydrateExpedienteFromApi: () => Promise<void>;
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
      hydrateExpedienteFromApi: async () => {
        try {
          const res = await fetch('/api/v1/perfil', {
            credentials: 'include',
            cache: 'no-store',
          });
          if (res.status === 401 || res.status === 404) return;
          if (!res.ok) return;
          const body = (await res.json()) as {
            expediente?: {
              rut: string;
              nombres: string;
              apellidoPaterno: string;
              apellidoMaterno: string;
              nacionalidad: string;
              fechaNacimiento: string;
            } | null;
            user?: { tier?: string; role?: string };
          };
          set((state) => {
            const next = { ...state };
            if (body.user) {
              if (body.user.tier === 'free' || body.user.tier === 'pro') {
                next.tier = body.user.tier;
              }
              if (body.user.role) next.role = body.user.role;
            }
            if (body.expediente) {
              const e = body.expediente;
              next.nombres = e.nombres;
              next.apellidoPaterno = e.apellidoPaterno;
              next.apellidoMaterno = e.apellidoMaterno;
              next.nacionalidad = e.nacionalidad;
              next.fechaNacimiento = e.fechaNacimiento;
              next.rut = e.rut;
            }
            next.coreProfile = toCoreProfile(next);
            return next;
          });
        } catch {
          /* red / sesión */
        }
      },
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
        if (merged.rut === undefined || merged.rut === null) merged.rut = '';
        merged.coreProfile = toCoreProfile(merged);
        return merged;
      },
      partialize: (state) => ({
        nombres: state.nombres,
        apellidoPaterno: state.apellidoPaterno,
        apellidoMaterno: state.apellidoMaterno,
        nacionalidad: state.nacionalidad,
        fechaNacimiento: state.fechaNacimiento,
        rut: state.rut,
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
