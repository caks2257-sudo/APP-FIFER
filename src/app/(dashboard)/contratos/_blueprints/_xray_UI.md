# Plano UI — Control de Contratos (`fifer-contratos-main`)

## Superficie de página

- **Ruta Next:** `src/app/(dashboard)/contratos/page.tsx` envuelve el contenido en `DashboardLayout` y delega el cuerpo a `ContratosPageShell` (`@/components/dashboard/contratos/ContratosPageShell`).

## Plantilla y layout

- **`BaseBoxTemplate`** (`@/components/v0-ingestion/templates/BaseBoxTemplate`): contenedor principal del módulo; recibe `data`, `config` con título que incluye el identificador del box, y estados `isLoading` / `isRefining` / `isLocked`.
- **Grid de 12 columnas:** el shell usa `className="grid min-h-0 grid-cols-12 gap-6 bg-[#0A0F1E]"` con bloques `col-span-12` (tabla principal y panel dev de resiliencia).

## Identificador del box

- **`boxId` operativo:** `fifer-contratos-main` — usado en el título de configuración del `BaseBoxTemplate`, en suscripciones al circuit breaker de caja y en la URL de datos vía el bridge.

## Paleta (alineada al módulo Finanzas)

- Acento **oro:** bordes y datos destacados `#EAB308` (y variantes con opacidad `/15`, `/20`, `/30`, `/35`).
- Fondo **oscuro tipo finance:** `#0A0F1E`, paneles `#1E293B` con transparencias; texto principal `#F9FAFB`, secundario `#CBD5E1` / `#94A3B8`.
- La jerarquía lateral **Finanzas** en `Sidebar` comparte el mismo acento activo (`#EAB308` / `#1E293B`), coherente con el módulo Finance (oro + superficies slate oscuras; “Esmeralda/Oro” en nomenclatura de producto).

## Otros envoltorios UI

- `BoxErrorBoundary`, `BoxLoader` (`module="contracts"`) rodean el `BaseBoxTemplate`.
- Tabla de contratos con cabeceras y filas estilizadas con la misma paleta de acento.

## SmartInsightWidget (Cerebro fractal)

- **Ubicación:** `ContratosPageShell` — debajo de `ContractsTable`, solo cuando hay filas (`rows.length > 0`).
- **Import:** `@/components/core/SmartInsightWidget`.
- **`moduleId`:** `finance` · **`boxId`:** `fifer-contratos-main` (alineado al box operativo).
- **`contextData`:** array `rows` (mismo origen que la tabla, equivalente a `payload.contratos` tras validación).
- **`systemInstruction`:** análisis de arriendos Chicureo, vencimientos críticos (menos de 60 días), riesgo en UF, insight breve con acción recomendada.
