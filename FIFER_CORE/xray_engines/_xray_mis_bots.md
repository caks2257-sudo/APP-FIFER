# X-Ray: Mis Bots

Documento de ADN técnico para el hub **Mis Bots** (`/dashboard/mis-bots` y submódulos, ej. Asistente DOM). Alineado a BDUI y al protocolo de blindaje FIFER.

---

## Propósito

Gestión de agentes LLM y asistentes conversacionales del usuario: inventario de bots, estado de sesión, enlaces a cada agente especializado y metadatos para orquestación futura. El frontend solo renderiza vistas derivadas del contrato BDUI.

---

## Estructura de Datos (Esquema BDUI)

```json
{
  "schemaVersion": "1.0",
  "module": "mis_bots",
  "updatedAt": "2026-04-10T12:00:00.000Z",
  "hub": {
    "title": "Mis Bots",
    "subtitle": "string | null",
    "bots": [
      {
        "id": "asistente-dom",
        "label": "Asistente DOM",
        "description": "string | null",
        "href": "/dashboard/mis-bots/asistente-dom",
        "icon": "message-square",
        "status": "idle | active | error | maintenance",
        "modelHint": "string | null",
        "enabled": true,
        "meta": {}
      }
    ]
  },
  "submodules": {
    "asistente-dom": {
      "screen": "chat | placeholder | settings",
      "messages": [],
      "systemPromptRef": "string | null",
      "actions": []
    }
  }
}
```

- `bots[]`: fuente única para acordeón lateral y página hub; ausencia o array vacío → *empty state*.
- `status`: el UI debe mapear a badges y deshabilitar acciones sin lanzar errores si el valor es desconocido (fallback a `idle`).

---

## Integraciones / APIs requeridas

| Integración | Uso previsto | Notas |
|-------------|--------------|--------|
| API interna FIFER | CRUD lógico de bots, permisos por usuario | Autenticación server-side |
| `[API_KEY_OPENAI]` | Completions / Assistants | Solo backend; rotación y límites |
| `[API_KEY_ANTHROPIC_CLAUDE]` | Mensajería alternativa | Marcador |
| `[API_KEY_CUSTOM_LLM]` | Proveedor propio o on-prem | Marcador |
| Webhooks / streaming | Respuestas en tiempo real | Definir contrato SSE o WebSocket en fase de implementación |

---

## Protocolo de Resiliencia

1. **Fallo de API de chat**: mostrar banner o toast; historial local opcional; no dejar pantalla en blanco — *Empty State* con explicación y reintentar.
2. **Respuesta parcial o chunk corrupto**: validar cada evento; descartar silenciosamente lo inválido y seguir con último estado coherente.
3. **Sin configuración de modelo**: usar copy por defecto y deshabilitar envío hasta que BDUI indique `enabled: true`.
4. **Fallback Data**: JSON demo con `bots: []` o un bot de muestra inactivo para QA y demos sin credenciales; nunca asumir que `messages` existe sin comprobar.

---

*Última revisión conceptual: alineada a FIFER Master Protocol y CRITICAL_APP_SHIELDING_PROTOCOL.*
