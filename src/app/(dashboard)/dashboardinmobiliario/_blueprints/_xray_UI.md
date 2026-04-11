# Plano Visual - DashboardInmobiliario

## Grid 12
- (Definir layout de 12 columnas para esta app: spans, breakpoints y densidad.)

## Paleta
- **Deep Navy** — fondos y contenedores principales.
- **Electric Yellow** — acentos, bordes activos y datos destacados.

## Catálogo de box (CircuitBreaker / auto-healing)
- **boxId:** `fifer-inmobiliario-main`
- **Slot:** principal de la página `dashboardinmobiliario` (contenedor raíz con `id="fifer-inmobiliario-main"`).
- **Variante visual:** **Hero** (bloque protagonista de la vista, `BaseBoxTemplate` a ancho completo del slot de página).
- **Registro:** `BOX_CATALOG` / `FIFER_BOX_CATALOG` — módulo `inmobiliario`, componente `inmobiliario-main`, `isResizable: true`.

## SmartInsightWidget (Cerebro fractal)

- **Ubicación:** `FiferInmobiliarioMain` (`@/components/v0-ingestion/boxes/FiferInmobiliarioMain.tsx`) — debajo de `PropiedadesTable`, solo cuando hay filas (`propiedades.length > 0`).
- **Import:** `@/components/core/SmartInsightWidget`.
- **`moduleId`:** `inmobiliario` · **`boxId`:** `fifer-inmobiliario-main`.
- **`contextData`:** array `propiedades` (estado cargado vía bridge / `InmobiliarioDataSchema`).
- **`systemInstruction`:** disponibilidad por unidad/proyecto, bajo stock, recomendación de pausar o acelerar pauta publicitaria.
