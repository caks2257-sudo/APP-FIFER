# Ingesta v0

**Socket JIT:** cada Box del Command Center resuelve su UI con **`import()` dinámico** desde `v0-ingestion/boxes/` según `manifest.boxId` (ver `registry.ts` y `BoxLoader` sin `children`).

**Flujo rápido**

1. **Crear** `boxes/<boxId-kebab>.tsx` con `export default` que reciba `FiferV0BoxProps` (`manifest` + props extra vía `jitChildProps` en el dashboard).
2. **Registrar** el `boxId` en **`registry.ts`** (`V0_BOX_REGISTRY`).
3. Prompt: matices en **`_xray_v0_MASTER.md`** → **«USER CUSTOM INSTRUCTIONS»**; Cursor fusiona con **`_xray_v0_local.md`** de la app activa. Luego **«Generar Prompt v0»**.

Cursor puede ayudarte a:

1. Alinear el componente con el contrato de props (`data`, `isLocked`, `config` — ver `_xray_landing.md` y `_xray_frontend_v0_bridge.md`).
2. Asociar un manifiesto (`IFiferBoxManifest` en `src/types/fifer-box.ts` o JSON en `src/components/core/manifests/`).
3. Conectar datos vía `fifer-api` / Supabase sin duplicar reglas de negocio; **`BoxLoader`** aplica `themeOverrides`, skeleton y errores.

**`boxId` desconocido:** se carga `boxes/unknown-box.tsx` (mensaje de registro).

### Carpetas y barrels

| Ruta | Uso |
|------|-----|
| `boxes/index.ts` | Exporta todos los default exports de `boxes/*.tsx` |
| `modules/finance|content|ingestor/index.ts` | Reexporta el socket del dominio; añade aquí nuevos `.tsx` por módulo |
| `modules/index.ts` | `export * as finance` / `content` / `ingestor` (namespaces) |
| `index.ts` (raíz) | `registry`, `types`, `boxes`, `modules` |

**Command Center:** el módulo activo (`finance` \| `content` \| `ingestor` \| `all`) lo gestiona `AppContextProvider` en `(dashboard)/layout.tsx`; `DashboardBoxSlots` solo monta los Boxes visibles.

No sustituye la revisión humana del manifiesto y del slot en el dashboard.
