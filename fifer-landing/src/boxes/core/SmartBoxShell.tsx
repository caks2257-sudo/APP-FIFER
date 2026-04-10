"use client";

import { BOX_REGISTRY } from "@/config/box.config";
import type { SmartBoxProps } from "@/types/box.types";
import clsx from "clsx";

function isRegisteredBox(boxId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BOX_REGISTRY, boxId);
}

function UnregisteredBoxError({ boxId }: { boxId: string }) {
  return (
    <div
      className="rounded-xl border border-rose-200/80 bg-rose-50/90 p-4 text-rose-950 shadow-sm"
      role="alert"
    >
      <p className="font-fifer-heading text-sm font-semibold tracking-tight">
        Caja no registrada
      </p>
      <p className="mt-1 font-fifer-body text-xs text-rose-800/90">
        El identificador <span className="font-mono text-rose-900">{boxId}</span> no existe en{" "}
        <span className="font-mono">BOX_REGISTRY</span>. Revisa la configuración del módulo.
      </p>
    </div>
  );
}

function RegisteredError({ message }: { message?: string }) {
  return (
    <div
      className="rounded-lg border border-rose-200/70 bg-rose-50/80 p-3 text-rose-950"
      role="alert"
    >
      <p className="font-fifer-heading text-sm font-medium">No se pudo cargar este bloque</p>
      <p className="mt-1 font-fifer-body text-xs text-rose-900/85">
        {message ?? "Se produjo un error al renderizar el contenido."}
      </p>
    </div>
  );
}

function GhostBlock() {
  return (
    <div
      className="flex min-h-[8rem] flex-col justify-center rounded-lg border border-dashed border-slate-300/80 bg-slate-100/40 px-4 py-6 text-center"
      aria-hidden
    >
      <div className="mx-auto mb-3 h-2 w-24 rounded-full bg-slate-300/60" />
      <p className="font-fifer-body text-xs text-slate-500">Espacio reservado (ghost)</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-1" aria-busy="true" aria-label="Cargando contenido">
      <div className="flex items-center gap-3">
        <div className="h-3 w-[28%] max-w-[12rem] animate-pulse rounded-md bg-slate-200/90" />
        <div
          className="h-1.5 w-10 shrink-0 animate-pulse rounded-full bg-fifer-yellow/90"
          aria-hidden
        />
      </div>
      <div className="h-2 w-full max-w-md animate-pulse rounded-full bg-slate-200/70" />
      <div className="space-y-2">
        <div className="h-16 w-full animate-pulse rounded-lg bg-slate-200/60" />
        <div className="flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-md bg-slate-200/55" />
          <div className="h-8 w-20 shrink-0 animate-pulse rounded-md bg-fifer-yellow/35" />
        </div>
        <div className="h-2 w-2/3 animate-pulse rounded-full bg-slate-200/65" />
      </div>
    </div>
  );
}

/**
 * Chasis Smart Box — envuelve contenido proveniente de v0 u otros orígenes.
 * Paleta «Nevado Técnico»: grises fríos, tarjeta casi blanca, borde sutil, radio 0.75rem (`rounded-xl`).
 */
export function SmartBoxShell({
  boxId,
  state,
  title,
  errorMessage,
  announceStatus,
  className,
  children,
}: SmartBoxProps) {
  const registered = isRegisteredBox(boxId);
  const entry = registered ? BOX_REGISTRY[boxId as keyof typeof BOX_REGISTRY] : undefined;
  const shellTitle = title ?? entry?.title ?? boxId;

  const rootClass = clsx(
    "rounded-xl border border-slate-200/75 bg-slate-50/95 text-slate-800 shadow-sm",
    "ring-1 ring-slate-200/30",
    state === "drag" && "ring-2 ring-fifer-yellow/40 shadow-md",
    className,
  );

  const headingId = `smart-box-title-${boxId}`;
  const liveId = `smart-box-live-${boxId}`;

  if (!registered) {
    return (
      <section
        className={rootClass}
        aria-labelledby={headingId}
        data-box-id={boxId}
        data-state="error"
      >
        <header className="border-b border-slate-200/60 px-4 py-3">
          <h2 id={headingId} className="font-fifer-heading text-sm font-semibold text-slate-700">
            {shellTitle}
          </h2>
        </header>
        <div className="p-4">
          <UnregisteredBoxError boxId={boxId} />
        </div>
      </section>
    );
  }

  const showMainContent =
    state === "idle" || state === "drag" || state === "locked";
  const showLockedOverlay = state === "locked";

  return (
    <section
      className={rootClass}
      aria-labelledby={headingId}
      data-box-id={boxId}
      data-state={state}
    >
      {announceStatus ? (
        <div id={liveId} className="sr-only" aria-live="polite">
          {shellTitle}, estado {state}
        </div>
      ) : null}

      <header className="border-b border-slate-200/60 px-4 py-3">
        <h2 id={headingId} className="font-fifer-heading text-sm font-semibold text-slate-700">
          {shellTitle}
        </h2>
      </header>

      <div className="relative px-4 py-4">
        {state === "loading" ? <LoadingSkeleton /> : null}
        {state === "error" ? <RegisteredError message={errorMessage} /> : null}
        {state === "ghost" ? <GhostBlock /> : null}

        {showMainContent ? (
          <div
            className={clsx(
              "relative min-h-0",
              showLockedOverlay && "pointer-events-none select-none opacity-[0.55]",
              state === "drag" && "z-[1]",
            )}
          >
            {children}
          </div>
        ) : null}

        {showLockedOverlay ? (
          <div
            className="pointer-events-auto absolute inset-0 z-[2] flex items-center justify-center rounded-lg bg-slate-100/55 backdrop-blur-[2px]"
            role="presentation"
            aria-hidden
          >
            <span className="rounded-full border border-slate-300/80 bg-slate-50/95 px-3 py-1 font-fifer-body text-xs font-medium text-slate-600 shadow-sm">
              Bloqueado
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
