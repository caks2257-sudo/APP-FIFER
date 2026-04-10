# 🎨 X-Ray UI local — fifer-ingestor

> **App:** `fifer-ingestor` — pipelines de ingesta / scraping / normalización.  
> **Chasis global:** [`_xray_v0_MASTER.md`](../_xray_v0_MASTER.md).

---

## Identidad visual propia

| Token | Uso |
|-------|-----|
| **Primario** | Carbón `#111827` |
| **Acento** | Ámbar operativo `#F59E0B` (alertas, progreso) |
| **Secundario** | Esmeralda `#10B981` (OK / fila completada) |
| **Advertencia** | Naranja `#EA580C` |

**Botones:** Primario ámbar sólido; secundario borde zinc + texto ámbar.

---

## Contrato de datos

- Props Box estándar en diseño; el slot **Ingestor** en `fifer-landing` usa **`IngestorFeedBox`** (JIT `fetchCampaignDrafts`, reintento vía `IngestorDashboardBox`).
- Scripts en **este** paquete sincronizan catálogos afiliados; la UI del Command Center consume el motor vía `fifer-api.ts`.

---

## 📂 Estructura y Árbol del Módulo

```text
fifer-ingestor/
├── package.json
├── scripts/
│   ├── mass_sync.js
│   └── sellers/sync_aliexpress.js
├── _xray_v0_local.md          # (este archivo)
└── _xray_ingestor.md          # legacy
```

### Inventario de Componentes Internos

| Ruta | Rol |
|------|-----|
| `scripts/mass_sync.js` | Sincronización masiva |
| `scripts/sellers/sync_aliexpress.js` | Sync catálogo AliExpress |

### Rutas API locales

Sin servidor HTTP en este paquete; scripts contra APIs de terceros o el monorepo motor según despliegue.

---

## Slots específicos

| `targetSlot` | Área |
|--------------|------|
| `slot-stats-grid` | Métricas de ingesta (throughput, errores) |
| `slot-main-content` | Tabla de jobs / logs |
| `slot-sidebar-nav` | Filtros rápidos |

---

## Ghost Mode local

- Overlay con acento **ámbar** (`themeOverrides.accent: #F59E0B`).
- Copy orientado a “Conectar worker” / API keys de ingesta.

```json
{
  "accent": "#F59E0B",
  "surface": "#111827",
  "primary": "#0f172a"
}
```

---

## Estado

- [ ] Sincronizar con cambios de pipeline o UI.
