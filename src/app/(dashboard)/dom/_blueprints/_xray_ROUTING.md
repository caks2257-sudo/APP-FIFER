# Plano ROUTING — DOM (Hub)

## UBICACIÓN LÓGICA

`FIFER://APP/DOM`

## Ruta pública

- **Path Hub:** `/dom`
- **Implementación:** `src/app/(dashboard)/dom/page.tsx`

## Spokes (sub-rutas)

| Ruta | Rol |
|------|-----|
| `/dom/recepcion` | Recepción Municipal |
| `/dom/permisos` | Permisos de Edificación |
| `/dom/regularizaciones` | Regularizaciones |
| `/dom/normativa` | Normativa OGUC/LGUC |

## Sidebar

- Grupo **Trámites DOM** en `src/registry/app-registry.ts`: `href: '/dom'`, hijos con rutas bajo `/dom/...`.
