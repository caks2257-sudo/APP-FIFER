# 🎨 X-Ray UI local — fifer-content

> **App:** `fifer-content` — motor de contenido / pipelines editoriales.  
> **Chasis global:** [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md).

---

## Identidad visual propia

| Token | Uso |
|-------|-----|
| **Primario** | Azul profundo `#1E3A5F` |
| **Secundario** | Negro mate `#0A0A0A` |
| **Acento** | Cian editorial `#22D3EE` o Electric Blue `#2563EB` (elige uno y mantén) |
| **Éxito / highlight** | Verde menta `#34D399` (solo estados positivos) |

**Gradientes:** `from-[#1E3A5F] to-[#0A0A0A]` en headers de sección; máximo 1 gradiente por vista.

**Botones:** Primario `bg-[#2563EB] hover:bg-blue-600`; ghost `border border-cyan-500/40 text-cyan-200`.

---

## Contrato de datos

- Props Box: `data`, `config`, `isLocked`.
- **JIT en dashboard:** el slot **Content** del Command Center en `fifer-landing` usa `ContentPipelineBox` + `fetchAiCapabilities()` contra el motor; **no** hay app Next en este paquete — este repo es scripts/servicios de generación.
- Endpoints de generación: ver scripts listados abajo; integración master documentar al cablear nuevos flujos.

---

## 📂 Estructura y Árbol del Módulo

```text
fifer-content/
├── package.json
├── scripts/
│   ├── main_orchestrator.js
│   ├── main_generator.js
│   ├── check_models.js
│   ├── services/              # audio_service, video_service, publish_service
│   └── src/
│       ├── lib/gemini_helpers.js
│       └── services/         # carousel, post, reels generators
├── _xray_v0_local.md          # (este archivo)
└── _xray_content.md           # legacy
```

### Inventario de Componentes Internos

| Ruta | Rol |
|------|-----|
| `scripts/main_orchestrator.js` | Orquestación alto nivel de generación |
| `scripts/main_generator.js` | Entrada generación principal |
| `scripts/services/audio_service.js` | Pipeline audio |
| `scripts/services/video_service.js` | Pipeline video |
| `scripts/services/publish_service.js` | Publicación contenido |
| `scripts/src/services/post_generator.js` | Posts |
| `scripts/src/services/reels_generator.js` | Reels |
| `scripts/src/services/carousel_generator.js` | Carruseles |
| `scripts/src/lib/gemini_helpers.js` | Helpers Gemini |
| `scripts/check_models.js` | Comprobación modelos |

### Rutas API locales

Este paquete **no** expone servidor HTTP propio en el árbol actual; opera como **scripts Node** invocables desde CI/local. Las APIs consumidas suelen ser externas (Gemini, etc.) o el master vía otro proceso.

---

## Slots específicos

| `targetSlot` | Área |
|--------------|------|
| `content-editor` | Editor principal / bloques |
| `slot-main-content` | Vista detalle artículo |
| `slot-sidebar-nav` | Herramientas / outline |

---

## Ghost Mode local

- Overlay con tint **azul/cian** (`--fifer-box-accent: #22D3EE` o `#2563EB`).
- Mensaje: tono “Contenido bloqueado” / BYOK si aplica.

**`themeOverrides` ejemplo:**

```json
{
  "primary": "#1E3A5F",
  "accent": "#2563EB",
  "surface": "#111827"
}
```

---

## Estado

- [ ] Actualizar al cambiar paleta o endpoints.
