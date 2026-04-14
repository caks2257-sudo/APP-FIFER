# Master App Factory — X-Ray

## UBICACIÓN LÓGICA
FIFER://engines/master-app-factory

**targetAppOrEngine:** `master-app-factory`

Motor de aprovisionamiento asíncrono de sub-apps dentro del ecosistema FIFER. Recibe encargos de creación desde la capa API, valida contratos de entrada y dispara jobs de provisión en segundo plano para materializar módulos y configuración inicial.

Además, incluye simulación controlada de scraping/ingesta para flujos de inicialización cuando no hay conectores externos activos, permitiendo bootstrapping consistente sin romper contratos del sistema.

Su comportamiento sigue la Ley §36 (Herencia Fractal): cada sub-app provisionada debe heredar capacidades del blueprint maestro y mantener coherencia estructural con las Apps raíz.
