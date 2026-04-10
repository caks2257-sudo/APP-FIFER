"use client";

import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";
import {
  suggestBaseManifest,
  suggestCatalogEntrySnippet,
} from "@/registry/box-catalog";

/**
 * El `boxId` no está en `BOX_CATALOG`: guía para cerrar el circuito (catálogo + manifiesto + `V0_BOX_LOADERS`).
 * Atributo en contenedor padre: `data-fifer-catalog-gap="true"`.
 */
export function CatalogGapBanner({ boxId, moduleId }: { boxId: string; moduleId?: string }) {
  const source = moduleId ?? "dashboard";
  const manifest = suggestBaseManifest(boxId, source, "slot-main");
  const catalogSnippet = suggestCatalogEntrySnippet(boxId);
  const manifestJson = JSON.stringify(manifest, null, 2);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      role="status"
      data-fifer-catalog-gap="true"
      style={{
        marginBottom: 10,
        padding: isDev ? 12 : 8,
        borderRadius: "0.75rem",
        border: `1px solid ${FIFER_ELECTRIC_YELLOW}44`,
        background: "rgba(234, 179, 8, 0.06)",
        color: "#e4e4e7",
        fontSize: isDev ? 12 : 11,
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: FIFER_ELECTRIC_YELLOW }}>
        Catálogo orgánico — boxId sin registrar
      </p>
      <p style={{ margin: "0 0 8px 0", color: "#a1a1aa", lineHeight: 1.4 }}>
        Registra <code style={{ color: "#fef08a" }}>{boxId}</code> en{" "}
        <code style={{ color: "#93c5fd" }}>box-catalog.ts</code>, añade el loader en{" "}
        <code style={{ color: "#93c5fd" }}>v0-ingestion/registry.ts</code> y ajusta el manifiesto al slot real del módulo.
      </p>
      {isDev ? (
        <>
          <p style={{ margin: "0 0 4px 0", fontSize: 11, color: "#71717a" }}>Sugerencia BOX_CATALOG:</p>
          <pre
            style={{
              margin: "0 0 8px 0",
              padding: 8,
              borderRadius: 8,
              background: "#0a0f1e",
              color: "#d4d4d8",
              fontSize: 11,
              overflow: "auto",
              maxHeight: 120,
            }}
          >
            {catalogSnippet}
          </pre>
          <p style={{ margin: "0 0 4px 0", fontSize: 11, color: "#71717a" }}>Manifiesto base (IFiferBoxManifest):</p>
          <pre
            style={{
              margin: 0,
              padding: 8,
              borderRadius: 8,
              background: "#0a0f1e",
              color: "#d4d4d8",
              fontSize: 11,
              overflow: "auto",
              maxHeight: 140,
            }}
          >
            {manifestJson}
          </pre>
        </>
      ) : (
        <p style={{ margin: 0, color: "#71717a" }}>Abre la consola del navegador para el aviso completo.</p>
      )}
    </div>
  );
}
