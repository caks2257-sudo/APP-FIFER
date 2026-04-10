# FIFER — Core UI (referencia monorepo)

- **Contrato:** `src/types/fifer-box.ts` (`IFiferBoxManifest`, opcional `themeOverrides` → vars CSS `--fifer-box-*`).
- **Orquestador:** `fifer-landing/src/components/core/BoxLoader.tsx` (permisos, `loading`, BYOK, `dataLocked`, Grid Tailwind).
- **Manifiestos JSON de ejemplo:** `fifer-landing/src/components/core/manifests/`.
- **Ingesta v0:** `fifer-landing/src/components/v0-ingestion/`.

El backend en `src/` (Node) no importa componentes React.
