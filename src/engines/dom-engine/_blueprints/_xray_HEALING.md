# Healing — dom-engine

## UBICACIÓN LÓGICA

`FIFER://engines/dom-engine`

- Errores de red / HTTP de proveedores IA: la ruta `POST /api/v1/dom/analisis` devuelve 502 con mensaje y fragmento de salida cuando el JSON no parsea o no valida Zod.
- Modo **MOCK** de claves: no se llama a red externa; respuesta determinista vía `buildMockCabidaResponse`.
