# Espejo técnico — UI FIFER (global)

**Clase de documento:** Espejo normativo de la capa de presentación compartida. No sustituye el `_xray_UI.md` de cada App; lo complementa con la jerarquía **Hub & Spoke** y el ADN visual.

**Fuentes canónicas:** `.cursorrules` (§0 Zero-Trust Visual, §11), `v0_pack/ui-kit/`, `v0_pack/blocks/`.

## Jerarquía Hub & Spoke (UI)

| Rol | Responsabilidad UI | Convención |
|-----|-------------------|------------|
| **Hub (App principal)** | Shell de página bajo `(dashboard)`, `SmartInsightWidget`, grid principal, navegación desde `app-registry.ts` | Un Hub = un segmento raíz `src/app/(dashboard)/<slug>/` con `_blueprints/_xray_UI.md` que describe layout y tokens del dominio |
| **Spoke (Sub-App)** | Pantallas anidadas que refinan el Hub; comparten paleta y patrones del Hub | Rutas hijas; tipo GPS `SUB_APP`; `_xray_UI.md` del spoke referencia al Hub (misma paleta Nevado Técnico) |

## ADN visual inmutable (Nevado Técnico)

- **Fondo:** Deep Navy `#0A0F1E`
- **Acento:** Electric Yellow `#EAB308`
- **Implementación:** solo Tailwind inline (prohibido CSS Modules / Styled Components en producto FIFER).

## Relación con datos

- `mainApp` en persistencia debe coincidir con el slug del **Hub** que originó el flujo.
- `subApp` opcional alinea con el **Spoke** cuando la UI y la API refinan el mismo dominio (ver `prisma/_xray_DATABASE_GLOBAL.md`).

## Planos locales obligatorios

Cada Hub y cada Spoke mantiene su `_blueprints/_xray_UI.md` como espejo 1:1 de componentes y rutas reales; este archivo global no duplica tablas de pantalla por módulo.
