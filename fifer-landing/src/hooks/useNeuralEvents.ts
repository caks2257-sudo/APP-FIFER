"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { contentMockData } from "@/mocks/content-data";
import { dispatchFiferAlert } from "@/store/useAlertStore";
import { useUserStore } from "@/store/useUserStore";

const POLL_MS = 120_000;

function isSameLocalCalendarDay(tsA: number, tsB: number): boolean {
  const a = new Date(tsA);
  const b = new Date(tsB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function visitedModuleToday(moduleId: string, last: Record<string, number>): boolean {
  const t = last[moduleId];
  if (!t) return false;
  return isSameLocalCalendarDay(t, Date.now());
}

function inventoryHasStock(stockLabel: string): boolean {
  const m = stockLabel.match(/^(\d+)/);
  if (!m) return true;
  return parseInt(m[1], 10) > 0;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function productKeywords(name: string): string[] {
  return stripAccents(name.toLowerCase())
    .split(/[^a-z0-9ñü]+/)
    .filter((w) => w.length >= 3);
}

function slugId(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function readFired(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFired(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

/**
 * Evalúa disparadores proactivos: revisión finanzas según ADN (día preferido) y cruce stock ABKupfer × intereses de búsqueda.
 */
export function evaluateNeuralTriggers(): void {
  if (typeof window === "undefined") return;

  const { neuralSchedule, moduleLastVisitAt, searchInterestSignals } = useUserStore.getState();
  const now = new Date();
  const weekday = now.getDay();
  const ymd = todayYmd();

  // —— Lunes (o día configurado): finanzas Chicureo sin visita hoy ——
  if (weekday === neuralSchedule.financeReviewWeekday) {
    if (!visitedModuleToday("finance", moduleLastVisitAt)) {
      const key = "fifer-neural-fired-finance-routine";
      if (readFired(key) !== ymd) {
        dispatchFiferAlert({
          level: "IA_INSIGHT",
          title: "Neural · Rutina Chicureo",
          body: "¿Revisamos el balance de Chicureo para empezar la semana con claridad?",
          sourceKey: `neural:finance-routine:${ymd}`,
          actionLabel: "Abrir finanzas",
          onAction: () => {
            window.location.assign("/finance/auditoria");
          },
        });
        writeFired(key, ymd);
      }
    }
  }

  // —— Stock ABKupfer × señales de interés (comandos / búsqueda) ——
  if (searchInterestSignals.length === 0) return;

  for (const inv of contentMockData.inventory) {
    if (!inventoryHasStock(inv.stock)) continue;
    const kws = productKeywords(inv.name);
    const hit = searchInterestSignals.some((sig) => {
      const s = stripAccents(sig.toLowerCase());
      return kws.some((kw) => kw.includes(s) || s.includes(kw));
    });
    if (!hit) continue;

    const id = slugId(inv.name);
    const key = `fifer-neural-fired-stock-${id}`;
    if (readFired(key) === ymd) continue;

    dispatchFiferAlert({
      level: "IA_INSIGHT",
      title: "Neural · Campaña ABKupfer",
      body: `Hay stock (${inv.stock}) en «${inv.name}» y coincide con temas que has estado mirando. ¿Crear una campaña instantánea?`,
      sourceKey: `neural:stock-campaign:${id}:${ymd}`,
      actionLabel: "Ir a contenido",
      onAction: () => {
        window.location.assign("/content/generar");
      },
    });
    writeFired(key, ymd);
    break;
  }
}

/**
 * Motor de eventos globales: registra visitas por módulo y evalúa disparadores en intervalos.
 */
export function useNeuralEvents(): void {
  const pathname = usePathname() || "";
  const recordModuleVisit = useUserStore((s) => s.recordModuleVisit);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    const seg = pathname.replace(/^\/+/, "").split("/")[0] || "";
    if (seg && !["login", "api"].includes(seg)) {
      recordModuleVisit(seg);
    }
  }, [pathname, recordModuleVisit]);

  useEffect(() => {
    evaluateNeuralTriggers();
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => evaluateNeuralTriggers(), POLL_MS);
    return () => window.clearInterval(id);
  }, []);
}
