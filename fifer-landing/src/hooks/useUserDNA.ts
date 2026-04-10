"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { moduleConfigs } from "@/modules";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useUserStore, type LayoutHistoryEntry, type UserPreferences, type UserProfile } from "@/store/useUserStore";
import type { ModuleConfig } from "@/types/architecture";

/** Perfil demo alineado con Chicureo / ABKupfer (Arquitecto & Real Estate Manager). */
export const DEMO_USER_DNA = {
  profile: {
    displayName: "Arquitecto & Real Estate Manager",
    role: "Principal · Inmobiliaria & Data",
    persona: "architect_real_estate",
  } satisfies UserProfile,
  preferences: {
    locale: "es" as const,
    currency: "UF" as const,
  } satisfies UserPreferences,
  /** Todos los módulos declarados en `module.config.ts` (orden de `moduleConfigs`). */
  activeModules: moduleConfigs.map((m) => m.id),
};

function allStaticModuleIds(): string[] {
  return moduleConfigs.map((m) => m.id);
}

export interface EffectiveUserDNA {
  profile: UserProfile;
  preferences: UserPreferences;
  /** IDs de módulos a mostrar (nunca vacío si hay módulos estáticos). */
  activeModules: string[];
  isDemoMode: boolean;
}

/**
 * Combina DNA persistido con modo demo: en demo, defaults de "Arquitecto & Real Estate Manager".
 */
export function useEffectiveUserDNA(): EffectiveUserDNA {
  const isDemoMode = useLayoutStore((s) => s.isDemoMode);
  const profile = useUserStore((s) => s.profile);
  const preferences = useUserStore((s) => s.preferences);
  const activeModules = useUserStore((s) => s.activeModules);

  return useMemo(() => {
    if (isDemoMode) {
      const mergedProfile: UserProfile = {
        ...DEMO_USER_DNA.profile,
        ...profile,
        displayName: profile.displayName?.trim() ? profile.displayName : DEMO_USER_DNA.profile.displayName,
      };
      const mergedPrefs: UserPreferences = {
        ...DEMO_USER_DNA.preferences,
        ...preferences,
      };
      const modules =
        activeModules.length > 0 ? activeModules : DEMO_USER_DNA.activeModules;
      return {
        profile: mergedProfile,
        preferences: mergedPrefs,
        activeModules: Array.from(new Set(modules)),
        isDemoMode: true,
      };
    }

    const modules = activeModules.length > 0 ? activeModules : allStaticModuleIds();
    return {
      profile,
      preferences,
      activeModules: Array.from(new Set(modules)),
      isDemoMode: false,
    };
  }, [isDemoMode, profile, preferences, activeModules]);
}

/**
 * Fusiona `moduleConfigs` (estático) con `activeModules` del DNA efectivo.
 */
export function useResolvedModuleConfigs(): ModuleConfig[] {
  const { activeModules } = useEffectiveUserDNA();
  return useMemo(() => {
    const allow = new Set(activeModules);
    const list = moduleConfigs.filter((m) => allow.has(m.id));
    return list.length ? list : moduleConfigs;
  }, [activeModules]);
}

/**
 * Al iniciar / al navegar: registra última vista en `layoutHistory` (autosanación / auditoría UX).
 */
export function useUserDNALayoutTrace(): void {
  const pathname = usePathname();
  const pushLayoutHistory = useUserStore((s) => s.pushLayoutHistory);

  useEffect(() => {
    const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    if (parts.length < 1) return;
    const moduleId = parts[0]!.toLowerCase();
    if (!moduleConfigs.some((m) => m.id === moduleId)) return;
    const sub = parts.slice(1);
    const routePath = sub.length ? `/${sub.join("/")}`.replace(/\/+$/, "") || "/" : "/";
    const entry: Omit<LayoutHistoryEntry, "at"> = { moduleId, routePath };
    pushLayoutHistory(entry);
  }, [pathname, pushLayoutHistory]);
}

/**
 * Punto de entrada en layouts cliente: traza de navegación + hidratación implícita del persist.
 */
export function UserDNAHydrator() {
  useUserDNALayoutTrace();
  return null;
}
