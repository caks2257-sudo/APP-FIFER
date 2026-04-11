# Plano Visual - misbots

## Grid 12

- (Definir layout de 12 columnas para esta app: spans, breakpoints y densidad.)

## Paleta

- **Deep Navy** — fondos y contenedores principales.
- **Electric Yellow (`#EAB308`)** — acentos, bordes activos y datos destacados.
- **Bordes oscuros** — contorno de tabla `border-[#1E293B]` coherente con el bioma Mis Bots.

## Box ADN

- **`boxId` operativo:** `fifer-misbots-main` — contenedor raíz `id="fifer-misbots-main"`, registro en `BOX_CATALOG` / `FIFER_BOX_CATALOG`, render vía `renderBoxById` / `FiferMisbotsMain`.
- **Variante:** **Hero** — slot principal de página a ancho completo del contenedor del dashboard (misma intención que inmobiliario/contratos: una caja principal que ocupa el foco visual de la vista).

## Tabla de flota (`FiferMisbotsMain`)

- **Datos:** filas desde `BotDataSchema` (`bots`) tras `fetchRealBoxDataForBridge('fiferMisbotsMain')`.
- **Columnas:** ID, Nombre, Estado, Modelo asignado, Costo promedio UF.
- **Estilo:** tabla envuelta en contenedor con borde oscuro y acentos Electric Yellow en headers secundarios, IDs, estados y costos (patrón alineado con `FiferInmobiliarioMain`).

## SmartInsightWidget (Cerebro fractal)

- **Import:** `@/components/core/SmartInsightWidget`.
- **Ubicación:** debajo de la tabla, solo cuando hay `bots.length > 0`.
- **Props:** `moduleId="bots"`, `boxId="fifer-misbots-main"`, `contextData={{ bots, preferencias: dna }}` donde `dna` es `useUserDnaStore((s) => s.getAppPreferences('bots'))`, e `systemInstruction` enfocado en tier, optimización de costos y cambio de modelo según rendimiento.
