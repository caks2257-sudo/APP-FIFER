# Manifiestos JSON (Fifer Box)

Cada Box puede declararse como **JSON** con la misma forma que `IFiferBoxManifest` (raíz del monorepo: `src/types/fifer-box.ts`).

## Archivos de anclaje (v0 / Cursor)

| Archivo | `boxId` | Notas |
|---------|---------|--------|
| `manifest-finance-snapshot.json` | `fifer-finance-snapshot` | `targetSlot`: `slot-stats-grid` |
| `manifest-content-pipeline.json` | `fifer-content-pipeline` | `targetSlot`: `slot-main-content` |
| `manifest-ingestor-feed.json` | `fifer-ingestor-feed` | `targetSlot`: `slot-sidebar-nav` |

- **`permissionScopes`**: strings RBAC para prompts v0; el runtime de panel sigue usando `permissions.requiredRole` en `BoxLoader`.
- **Consumo**: `dashboard/boxManifests.ts` importa estos JSON y los pasa a `BoxLoader` como `manifest={...}`.
