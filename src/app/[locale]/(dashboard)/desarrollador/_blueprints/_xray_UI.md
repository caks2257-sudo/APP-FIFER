# Plano Visual - desarrollador

## Grid 12
- (Definir layout de 12 columnas para esta app: spans, breakpoints y densidad.)

## Paleta
- **Deep Navy** — fondos y contenedores principales.
- **Electric Yellow** — acentos, bordes activos y datos destacados.

## Sala de Guerra (§16 — monitoreo de salud)
- Pestaña **SALA DE GUERRA** en `page.tsx` (junto a «Conexiones por categoría»): componente `WarRoomPanel` (`src/components/system/WarRoomPanel.tsx`).
- Grid **3 columnas** (Nevado Técnico): (1) motores internos con pulso por `EngineRegistry` / `system-health`, (2) latencias Bridge vía `pingAllActiveIntegrations()` en `external-bridge-engine`, (3) consola de eventos `getEnvManagerRecentEvents()` (Sub-Engine `env-manager`).
- API agregada: `GET /api/v1/war-room` (admin); `schemaVersion` `1.0-war-room`.
