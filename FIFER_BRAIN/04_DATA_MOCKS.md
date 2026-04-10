# 04_DATA_MOCKS

> Mock data oficial para v0.dev, alineado con contratos de `master-blueprint` + interfaces backend/mocks actuales.
> Objetivo: usar exactamente los nombres de campo del código (por ejemplo, `amount`, `commissionRatePct`, `reachEstimate`, `refined`).

## Módulo FINANCE

### 1) Transacción (`transactions` / `ledger`)

```json
{
  "id": "tx-7f0d34f2-1e0e-4e58-8a2b-19a9f0b57d11",
  "type": "referral_earn",
  "amount": 485000,
  "currency": "CLP",
  "status": "posted",
  "wallet_id": "wallet-93c64cc0-6d69-45aa-b435-e62f50dd8fc8",
  "metadata": {
    "draft_id": "draft-chicureo-2026-04-001",
    "source_store": "mercadolibre",
    "platform": "mercadolibre",
    "rut_emisor": "76.123.456-7",
    "comuna": "Chicureo"
  },
  "created_at": "2026-04-09T01:21:30.000Z"
}
```

### 2) KPI de flujo de caja (`cashflowChart` + KPI derivados)

```json
{
  "summary": {
    "totalUF": 1250,
    "pendingUF": 180,
    "activeProjects": 5
  },
  "cashflowChart": [
    { "month": "Ene", "income": 120, "expenses": 40 },
    { "month": "Feb", "income": 150, "expenses": 45 },
    { "month": "Mar", "income": 90, "expenses": 50 }
  ],
  "kpi": {
    "currency": "UF",
    "ufValueClpPerDay": 39250,
    "netFlowUF": 225,
    "netFlowClp": 8831250
  }
}
```

### 3) Estado de trámite municipal (proyecto Chicureo)

```json
{
  "id": "ch-001",
  "name": "Regularización Casa Valle Norte",
  "location": "Chicureo",
  "status": "Municipalidad",
  "progress": 65,
  "fee": "45 UF",
  "alerts": [
    "Falta firma propietario en Formulario 5.1",
    "Revisión DOM programada para 2026-04-15"
  ],
  "municipalTrace": {
    "rutPropietario": "13.765.432-1",
    "comuna": "Colina (Chicureo)",
    "expediente": "DOM-COL-2026-8891",
    "nextStep": "Subir plano firmado por arquitecto"
  }
}
```

## Módulo CONTENT

### 1) Campaña de Video (`campaigns`)

```json
{
  "title": "Mini-Serie: Terrazas de Invierno",
  "platform": "Instagram/TikTok",
  "status": "Generando con IA",
  "assets": [
    "Video_1_Hook.mp4",
    "Video_2_DeepDive.mp4"
  ],
  "reachEstimate": "15k - 25k",
  "metadata": {
    "brand": "ABKupfer.cl",
    "market": "Chile",
    "objective": "Leads para proyectos en Chicureo"
  }
}
```

### 2) Ítem de inventario ABKupfer (`inventory`)

```json
{
  "name": "Piso Ingeniería Roble Europeo",
  "stock": "140 m2",
  "price": "$42.990/m2",
  "trend": "Alta",
  "sku": "ABK-ROBLE-ING-14",
  "supplierRut": "77.456.321-9",
  "warehouseComuna": "Colina (Chicureo)"
}
```

### 3) Prompt refinado (acción `refine-prompt` de Gemini)

```json
{
  "provider": "gemini",
  "action": "refine-prompt",
  "payload": {
    "model": "gemini-2.0-flash",
    "prompt": "Hazme un video para vender pisos de madera",
    "system": "Refina el prompt del usuario: más claro, accionable, sin texto extra alrededor."
  },
  "result": {
    "ok": true,
    "status": 200,
    "data": {
      "refined": "Crea un guion de video vertical (30s) para Instagram/TikTok que promocione pisos de madera ABKupfer en Chicureo. Incluye hook inicial, beneficios (durabilidad, aislación térmica, estética), CTA a WhatsApp y tono premium cercano.",
      "raw": {
        "usage": {
          "prompt_tokens": 312,
          "candidates_tokens": 142,
          "total_tokens": 454
        }
      }
    }
  }
}
```

### 4) Resolución de llave interna (`AIVault`) vía AI Proxy (sin exponer secretos)

```json
{
  "request": {
    "provider": "openai",
    "action": "chat-completions",
    "payload": {
      "model": "gpt-4o-mini",
      "messages": [
        { "role": "user", "content": "Resume el estado financiero de hoy." }
      ]
    }
  },
  "runtime": {
    "resolver": "AIVault.resolveKey(provider, userId?)",
    "adminEnvLookup": "FIFER_ADMIN_OPENAI_KEY",
    "userId": "6a87b36f-6a90-4f74-8f54-c4a9b5140bdf"
  },
  "security": {
    "returnsKeyToClient": false,
    "notes": "La llave solo se entrega al proveedor interno; nunca se serializa en response."
  }
}
```

### 5) Respuesta normalizada por Adaptador Universal (`AiFactory` + providers)

```json
{
  "taskType": "text",
  "provider": "openai",
  "response": {
    "ok": true,
    "status": "ok",
    "provider": "openai",
    "taskType": "text",
    "data": {
      "id": "chatcmpl-abc123",
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": "Resumen financiero listo."
          }
        }
      ]
    },
    "error": null
  },
  "fallbackOnFailure": {
    "ok": false,
    "status": "degraded",
    "provider": "openai",
    "taskType": "text",
    "data": null,
    "error": "openai_upstream_error:503"
  }
}
```

### 6) Endpoint seguro AI Proxy (`POST /api/v1/master/ai/proxy`)

```json
{
  "request": {
    "provider": "openai",
    "action": "chat-completions",
    "payload": {
      "model": "gpt-4o-mini",
      "messages": [
        { "role": "user", "content": "Dame un resumen ejecutivo de ventas." }
      ]
    }
  },
  "response": {
    "ok": true,
    "provider": "openai",
    "action": "chat-completions",
    "taskType": "text",
    "data": {
      "ok": true,
      "status": "ok",
      "provider": "openai",
      "taskType": "text",
      "data": {
        "id": "chatcmpl-xyz77",
        "choices": [
          {
            "index": 0,
            "message": { "role": "assistant", "content": "Resumen generado." }
          }
        ]
      },
      "error": null
    }
  },
  "errorResponseExample": {
    "ok": false,
    "error": "provider_error",
    "message": "[redacted]"
  },
  "security": {
    "apiKeyInBody": false,
    "apiKeyInHeaders": false
  }
}
```

### 7) Servicio frontend `getUFValue()` (Finance) consumiendo AI Proxy

```json
{
  "request": {
    "url": "/api/v1/master/ai/proxy",
    "method": "POST",
    "body": {
      "provider": "openai",
      "action": "get_current_uf",
      "payload": {
        "context": "Necesito el valor actual de la UF en Chile hoy"
      }
    }
  },
  "response": {
    "ok": true,
    "provider": "openai",
    "action": "get_current_uf",
    "taskType": "text",
    "data": {
      "ok": true,
      "status": "ok",
      "provider": "openai",
      "taskType": "text",
      "data": {
        "choices": [
          {
            "index": 0,
            "message": {
              "role": "assistant",
              "content": "Valor UF hoy en Chile: $37.850,42"
            }
          }
        ]
      },
      "error": null
    }
  },
  "frontendParsedResult": {
    "value": 37850.42,
    "formatted": "$37.850,42",
    "source": "ai-proxy"
  }
}
```

## Módulo AFFILIATES

### 1) Resumen de comisiones (`commissionLines` + snapshot)

```json
{
  "commissionLines": [
    {
      "id": "cm-001",
      "label": "Venta materiales · pedido #MP-8821",
      "orderRef": "MP-8821",
      "materialFamily": "Drywall + perfiles",
      "saleAmountClp": 2450000,
      "commissionRatePct": 6.5,
      "commissionClp": 159250,
      "state": "approved"
    },
    {
      "id": "cm-002",
      "label": "Venta herramientas eléctricas · pedido #MP-8824",
      "orderRef": "MP-8824",
      "materialFamily": "Herramientas",
      "saleAmountClp": 890000,
      "commissionRatePct": 5,
      "commissionClp": 44500,
      "state": "pending"
    }
  ],
  "summary": {
    "commissions": 203750,
    "currency": "CLP",
    "conversionRate": 1.5
  }
}
```

### 2) Lista de referidos (`networks` + referidos)

```json
{
  "networks": [
    {
      "id": "net-ferreteria-pro",
      "name": "Ferretería Pro Partners",
      "status": "healthy",
      "lastSyncMs": 120000,
      "activePublishers": 84
    },
    {
      "id": "net-materiales-cl",
      "name": "Materiales.cl Afiliados",
      "status": "degraded",
      "lastSyncMs": 900000,
      "activePublishers": 31
    }
  ],
  "referredList": [
    {
      "referralId": "ref-001",
      "fullName": "Constructora Chicureo Norte SpA",
      "rut": "77.234.891-4",
      "sourceNetworkId": "net-ferreteria-pro",
      "firstOrderRef": "MP-8821",
      "lifetimeSalesClp": 7450000,
      "lifetimeCommissionClp": 352400,
      "state": "active"
    },
    {
      "referralId": "ref-002",
      "fullName": "Inmobiliaria Valle Piedra Ltda",
      "rut": "76.998.112-0",
      "sourceNetworkId": "net-materiales-cl",
      "firstOrderRef": "MP-8812",
      "lifetimeSalesClp": 1980000,
      "lifetimeCommissionClp": 89100,
      "state": "onboarding"
    }
  ]
}
```

### Cashflow sub-engine (API v2, gateway)

**Ruta:** `GET /api/v2/engines/finance/cashflow/snapshot`  
**Headers:** `x-fifer-api-key: <key>` (scope Supabase `api_keys.scope` = `finance.cashflow` o `*`; `permissions` incluye `read` o `*`).

```json
{
  "status": "success",
  "data": {
    "message": "Cashflow sub-engine alcanzado de forma segura.",
    "auth": {
      "keyId": "uuid-key",
      "ownerType": "user",
      "ownerId": "uuid-owner"
    },
    "metrics": { "pending_uf": 0, "cleared_clp": 0 }
  }
}
```

**Sin header de API key:** `{ "error": "Missing x-fifer-api-key header" }` con HTTP 401.

**Consumo desde Next (Fase 4):** `fifer-landing/src/lib/fifer-api-client.ts` (`fetchFiferEngine`) inyecta el header opcional; **401/403** → `{ isLocked: true }` en `getFinanceSnapshotData` (`src/lib/finance-snapshot-data.ts`), que alimenta `src/app/(dashboard)/finance/page.tsx` y activa **`BoxLockedOverlay`** en `FiferFinanceSnapshot` cuando no hay llave válida. Respuesta **200:** el payload `data.metrics` se proyecta a `kpis` para el grid del box.
