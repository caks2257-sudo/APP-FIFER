# FIFER — X-Ray local (plantilla maestra / molde genético)

> **Uso:** copiar este archivo a `<paquete>/_xray_v0_local.md` (o ruta homóloga del módulo) y reemplazar marcadores `«…»`.  
> **Chasis global:** [`_xray_v0_MASTER.md`](../../_xray_v0_MASTER.md) · **Contrato shell:** [`_xray_PROTOCOL_SHELL.md`](../../_xray_PROTOCOL_SHELL.md).

---

## Metadata

| Campo | Valor |
|--------|--------|
| **Versión ADN** | 1.0.0 |
| **Fecha de creación** | «YYYY-MM-DD» |

La **versión ADN** sigue semver del molde FIFER; incrementar solo si cambia el contrato de secciones de esta plantilla. La **fecha de creación** debe fijarse al instanciar el módulo (seed o copia manual).

---

## Estado de salud

| Indicador | Valor |
|-----------|--------|
| **Estado** | ⚪ Nuevo / En construcción |

Actualizar cuando el módulo pase a estable: 🟢 Estable · 🔴 Bloqueado (motivo breve).

---

## Identidad visual

Espacios para definir tokens de interfaz del módulo (alineados al shell cuando aplique).

| Token | Valor |
|--------|--------|
| **Primario** | «#000000» — descripción (fondo / superficie principal) |
| **Acento** | «#EAB308» — descripción (CTA, bordes activos, highlights) |
| **Bioma / notas** | «Textura, contraste con Deep Navy del shell, excepciones documentadas» |

Alinear con **`docs/styleguide.md`** y **`_xray_v0_MASTER.md`** salvo variante documentada aquí.

---

## Slots (Boxes que exporta el módulo)

Definición de los **Fifer Boxes** que el módulo expone en el layout (grid 12). Cada fila debe mapearse a `boxId` + manifiesto.

| `boxId` | Slot / región | Rol (1 línea) | Estado |
|---------|----------------|---------------|--------|
| «fifer-ejemplo-box» | «main-slot» | «Resumen / tabla / formulario» | ⚪ |

**Reglas:** nuevos `boxId` → catálogo `fifer-landing/src/registry/box-catalog.ts` + `v0-ingestion/registry.ts` + manifiesto.

---

## Contrato de datos (Protocolo Shell)

Esquema esperado para la superficie SDUI: `BoxProps` (`data`, `config`, `isLoading`, `error`, `isLocked`, `isRefining` cuando aplique). Ver **`_xray_PROTOCOL_SHELL.md`**.

### Esquema `data` (referencia)

```ts
// Ejemplo — sustituir por tipos reales del módulo
interface «NombreModulo»BoxData {
  // campos normalizados (sin secretos en el .tsx)
}
```

### `config` (SDUI)

| `config.type` | Uso |
|---------------|-----|
| «table» | «Columnas, acciones» |
| «chart» | «Series, ejes» |
| «form» | «Campos, validación» |

### Integraciones / API

- **Base URL / env:** «`NEXT_PUBLIC_…` / motor `src/…`»
- **Payload mínimo:** «lista de campos requeridos para hidratar sin Ghost»

---

## Audit log local

Sección para el **historial de cambios** del módulo (rutas, slots, `boxId`, contratos, bioma). Entradas más recientes arriba.

| Fecha (YYYY-MM-DD) | Cambio |
|--------------------|--------|
| «YYYY-MM-DD» | «Creación del X-Ray desde plantilla maestra» |

---

*Auditoría X-Ray · Última sincronización: YYYY-MM-DD*
