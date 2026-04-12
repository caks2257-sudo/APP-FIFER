# Contrato — dom-engine

## UBICACIÓN LÓGICA

`FIFER://engines/dom-engine`

**Entrada / salida normativa (sub-motor `dom-engine:normative-analyzer`):**

- **Request:** `DomAnalisisRequest` (`src/types/schemas.ts` — `domAnalisisRequestSchema`).
- **Response:** `DomAnalisisResponse` (`domAnalisisResponseSchema`).

**HTTP:** `POST /api/v1/dom/analisis` — cuerpo JSON validado con `domAnalisisRequestSchema`; respuesta `domAnalisisResponseSchema`.
