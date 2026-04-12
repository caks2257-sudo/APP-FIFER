# Healing — finance-engine (raíz)

- **Circuito:** los fallos de negocio se manejan en rutas API y en sub-motores (billing, payments, reconciliation) con `try/catch` y respuestas HTTP coherentes.
- **Resiliencia:** reintentos y degradación dependen del sub-engine invocado (p. ej. Bridge MOCK/PROD en reconciliación y pagos).
- **Sin rompecircuitos globales** a nivel del shell del motor raíz; documentar umbrales en el plano HEALING de cada sub-engine.
