Lógica — finance-engine (v10.0 Stateless Adapter)
UBICACIÓN LÓGICA
FIFER://engines/finance-engine

targetAppOrEngine: finance-engine

Rol (Context Node)
Actúa como el Nodo de Contexto y Adaptador Financiero del ecosistema FIFER. Operando bajo la Ley §5 (Stateless Orchestration), este motor carece de lógica algorítmica pesada. Su responsabilidad es validar los contratos de datos financieros (Zod) y delegar la ejecución a Agentes Externos (Fintoc para bancos, Tasklet/SII para facturación) a través del external-bridge-engine.

Protocolo de Orquestación (Flujos Aislados)
Payments (Pagos): Valida CreatePaymentCheckoutInput y delega la creación de links de pago al proveedor transaccional. Retorna URLs de checkout operando en modo PROD o simulación MOCK.

Reconciliation (Conciliación): Valida ReconciliationPreviewInput / ReconciliationApplyInput. Delega la lectura de cartolas bancarias y sincroniza saldos (balance) mediante la inyección de ReconciliationMovementSchema.

Billing (Facturación Automática): Intercepta identificadores de transacción y delega la emisión de boletas/facturas (EmitInvoiceOutput) al agente tributario correspondiente.

Estructura de Archivos (v10.0)
src/engines/finance-engine/index.ts — Fachada de delegación y registro en el EngineRegistry.

src/engines/finance-engine/schemas.ts — Única fuente de verdad. Contratos Zod estrictos para Pagos, Conciliación y Facturación.

src/engines/finance-engine/_blueprints/ — Memoria semántica para el AODS.

CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)
Nota para el Copilot: Estas palabras clave activan la redirección instantánea hacia el panel de control financiero y de tesorería.

finanzas

conciliación bancaria

estado de cuenta

movimientos bancarios

saldo de cuenta

flujo de caja

cashflow

generar link de pago

pagar factura

facturación automática

emisión de boleta

ingresos y egresos

tesorería

cartola bancaria