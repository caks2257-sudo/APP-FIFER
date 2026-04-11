# X-Ray: Mis Apps

Documento de ADN técnico para el hub **Mis Apps** (`/dashboard/mis-apps` y submódulos). Alineado a BDUI y al protocolo de blindaje FIFER.

---

## Propósito

Laboratorio de aplicaciones personalizadas del usuario dentro de FIFER: catálogo de apps habilitadas, estado de cada submódulo y navegación hacia experiencias embebidas (ej. App AB Kupfer). El frontend actúa como capa reactiva sobre un contrato JSON definido por el backend.

---

## Estructura de Datos (Esquema BDUI)

El backend expone un documento raíz que el shell consume sin asumir campos opcionales como obligatorios.

```json
{
  "schemaVersion": "1.0",
  "module": "mis_apps",
  "updatedAt": "2026-04-10T12:00:00.000Z",
  "hub": {
    "title": "Mis Apps",
    "subtitle": "string | null",
    "apps": [
      {
        "id": "ab-kupfer",
        "label": "App AB Kupfer",
        "description": "string | null",
        "href": "/dashboard/mis-apps/ab-kupfer",
        "icon": "box",
        "badge": { "text": "Beta", "tone": "warning" },
        "enabled": true,
        "meta": {}
      }
    ]
  },
  "submodules": {
    "ab-kupfer": {
      "screen": "placeholder | detail | form",
      "sections": [],
      "actions": []
    }
  }
}
```

- `apps[]`: lista canónica para sidebar y hub; si está vacía o ausente, el UI muestra *empty state*.
- `submodules`: payload por app; cada clave debe coincidir con `apps[].id` cuando aplique.

---

## Integraciones / APIs requeridas

| Integración | Uso previsto | Notas |
|-------------|--------------|--------|
| API interna FIFER | Listado y configuración de apps por usuario | Base URL y auth según entorno |
| `[API_KEY_OPENAI]` | Futuras apps con asistencia generativa | Marcador: configurar en backend, nunca en cliente |
| `[API_KEY_ANTHROPIC_CLAUDE]` | Alternativa LLM | Marcador |
| Servicios terceros por app | Ej. catálogos, pagos | Documentar por submódulo en extensiones de este esquema |

---

## Protocolo de Resiliencia

1. **Fallo de red o 5xx**: capturar en capa de datos; mostrar mensaje breve + botón reintentar; no propagar excepciones al árbol de React sin boundary.
2. **Payload inválido o incompleto**: validar con esquema (Zod/similar en servidor o cliente); usar `?.` y `??` en render; *Empty State* con copy neutro si no hay apps.
3. **Timeout**: mismo tratamiento que fallo de red; opcional *skeleton* mientras `loading`.
4. **Fallback Data**: si la API no está disponible en desarrollo o modo degradado, servir JSON estático mínimo (`apps: []` o demo) para que la UI no rompa y siga demostrable.

---

*Última revisión conceptual: alineada a FIFER Master Protocol y CRITICAL_APP_SHIELDING_PROTOCOL.*
