/**
 * FIFER DISCOVERY REGISTRY (AODS-CORE)
 * Keywords orientadas a intencion humana (Ley §29 y §30).
 * Sin terminos tecnicos de implementacion.
 */

import type { FiferModuleManifest } from '@/registry/manifest';
import { afiliadosManifest } from '@/app/[locale]/(dashboard)/afiliados/manifest';
import { finanzasManifest } from '@/app/[locale]/(dashboard)/finanzas/manifest';
import { redesSocialesManifest } from '@/app/[locale]/(dashboard)/redes-sociales/manifest';
import { systemWarRoomManifest } from '@/app/[locale]/(dashboard)/system/manifest';

export interface AppDiscovery {
  id: string;
  path: string;
  keywords: string[];
}

export const DISCOVERY_MANIFEST: AppDiscovery[] = [
  {
    id: 'app:contratos',
    path: 'contratos',
    keywords: [
      'contratos',
      'gestion contractual',
      'revision de contrato',
      'estado de contrato',
      'documentos legales',
      'seguimiento contractual',
    ],
  },
  {
    id: 'app:dashboard',
    path: 'dashboard',
    keywords: [
      'panel principal',
      'resumen general',
      'acceso a modulos',
      'vista ejecutiva',
      'estado general',
      'perfil',
    ],
  },
  {
    id: 'app:dashboard-contenido-ai',
    path: 'dashboard/contenido-ai',
    keywords: [
      'contenido asistido por ia',
      'generacion de contenido',
      'copiloto de contenido',
      'borrador de publicaciones',
      'apoyo de redaccion',
      'ideas de contenido',
    ],
  },
  {
    id: 'app:dashboard-contratos',
    path: 'dashboard/contratos',
    keywords: [
      'contratos',
      'hub de contratos',
      'navegar a contratos',
      'gestion contractual',
      'estado de contratos',
      'documentacion legal',
    ],
  },
  {
    id: 'app:dashboard-mis-apps',
    path: 'dashboard/mis-apps',
    keywords: [
      'mis aplicaciones',
      'catalogo de apps',
      'accesos de trabajo',
      'modulos disponibles',
      'app inmobiliaria',
      'herramientas activas',
    ],
  },
  {
    id: 'app:dashboard-mis-apps-ab-kupfer',
    path: 'dashboard/mis-apps/ab-kupfer',
    keywords: [
      'ab kupfer',
      'workspace inmobiliario',
      'gestion de proyectos',
      'herramientas de arquitectura',
      'flujo inmobiliario',
      'modulo especializado',
    ],
  },
  {
    id: 'app:dashboard-mis-bots',
    path: 'dashboard/mis-bots',
    keywords: [
      'mis bots',
      'asistentes disponibles',
      'agentes activos',
      'automatizaciones',
      'chat especializado',
      'configuracion de bots',
    ],
  },
  {
    id: 'app:dashboard-mis-bots-asistente-dom',
    path: 'dashboard/mis-bots/asistente-dom',
    keywords: [
      'asistente',
      'asistente dom',
      'consulta normativa',
      'apoyo en permisos',
      'tramites municipales',
      'copiloto dom',
    ],
  },
  {
    id: 'app:dashboard-perfil',
    path: 'dashboard/perfil',
    keywords: [
      'expediente',
      'perfil',
      'datos del proyecto',
      'ficha del expediente',
      'informacion del cliente',
      'actualizar perfil',
    ],
  },
  {
    id: 'app:dashboardinmobiliario',
    path: 'dashboardinmobiliario',
    keywords: [
      'dashboard inmobiliario',
      'operacion inmobiliaria',
      'indicadores de proyectos',
      'gestion de obras',
      'seguimiento inmobiliario',
      'resumen comercial',
    ],
  },
  {
    id: 'app:desarrollador',
    path: 'desarrollador',
    keywords: [
      'panel tecnico',
      'estado de integraciones',
      'diagnostico del sistema',
      'latencia de servicios',
      'observabilidad',
      'monitoreo operativo',
      'salud de motores',
      'conexiones externas',
    ],
  },
  {
    id: 'app:desarrollador-conexiones-externas',
    path: 'desarrollador/conexiones-externas',
    keywords: [
      'conexiones externas',
      'integraciones',
      'estado de conexion',
      'sincronizacion de proveedores',
      'credenciales de integracion',
      'acceso administrador',
      'diagnostico de conectores',
      'refresh de conexiones',
    ],
  },
  {
    id: 'app:dom',
    path: 'dom',
    keywords: [
      'dom',
      'expediente municipal',
      'normativa urbana',
      'permisos de obra',
      'recepcion final',
      'regularizacion',
      'cabida',
      'formulario municipal',
      'analisis de terreno',
      'factibilidad normativa',
    ],
  },
  {
    id: 'app:dom-normativa',
    path: 'dom/normativa',
    keywords: [
      'normativa dom',
      'analisis normativo',
      'factibilidad del terreno',
      'reglas urbanisticas',
      'informe de factibilidad',
      'cumplimiento normativo',
      'evaluacion de proyecto',
      'restricciones urbanas',
    ],
  },
  {
    id: 'app:dom-permisos',
    path: 'dom/permisos',
    keywords: [
      'permisos municipales',
      'permiso de edificacion',
      'tramites de obra',
      'documentacion municipal',
      'solicitud de permiso',
      'requisitos de permiso',
    ],
  },
  {
    id: 'app:dom-recepcion',
    path: 'dom/recepcion',
    keywords: [
      'recepcion final',
      'cierre de obra',
      'certificacion municipal',
      'entrega municipal',
      'documentos de recepcion',
      'aprobacion final',
    ],
  },
  {
    id: 'app:dom-regularizaciones',
    path: 'dom/regularizaciones',
    keywords: [
      'regularizacion de obra',
      'ley del mono',
      'normalizacion municipal',
      'subsanar observaciones',
      'actualizacion de expediente',
      'tramite de regularizacion',
    ],
  },
  {
    id: 'app:finanzas',
    path: 'finanzas',
    keywords: [
      'finanzas',
      'estado de cuenta',
      'saldo actual',
      'ingresos y egresos',
      'flujo de caja',
      'movimientos bancarios',
      'conciliacion',
      'proyeccion de liquidez',
      'historial de pagos',
      'facturacion',
    ],
  },
  {
    id: 'app:ia-orchestrator',
    path: 'ia-orchestrator',
    keywords: [
      'orquestador de ia',
      'ruteo de modelos',
      'prompt engineering',
      'asistente inteligente',
      'seleccion de proveedor ia',
      'control de conversaciones',
      'estrategia de respuesta',
      'automatizacion conversacional',
    ],
  },
  {
    id: 'app:misbots-[id]-config',
    path: 'misbots/[id]/config',
    keywords: [
      'configurar bot',
      'detalle del bot',
      'estado del bot',
      'ajustes del asistente',
      'parametros de bot',
      'activar o pausar bot',
      'perfil del agente',
    ],
  },
  {
    id: 'app:misbots',
    path: 'misbots',
    keywords: [
      'mis bots',
      'lista de bots',
      'estado de bots',
      'administrar asistentes',
      'automatizaciones activas',
      'configuracion de agentes',
      'hub de bots',
    ],
  },
  {
    id: 'app:misbots-config',
    path: 'misbots/config',
    keywords: [
      'configuracion de bots',
      'parametros de asistentes',
      'preferencias de automatizacion',
      'ajustes del hub de bots',
      'control de estado de bots',
      'nombre y estado del bot',
    ],
  },
  {
    id: 'app:war-room',
    path: 'war-room',
    keywords: [
      'war room',
      'monitoreo en vivo',
      'latencia de servicios',
      'estado operacional',
      'incidentes',
      'alertas del sistema',
      'telemetria',
      'centro de control',
    ],
  },
  {
    id: 'engine:ai-fallback-cascade',
    path: 'ai-fallback-cascade',
    keywords: [
      'respaldo de proveedores ia',
      'fallback de respuesta',
      'continuidad conversacional',
      'cambio automatico de proveedor',
      'respuesta de contingencia',
      'degradacion controlada',
    ],
  },
  {
    id: 'engine:ai-fallback-cascade-sub-engines-comms',
    path: 'ai-fallback-cascade/sub-engines/comms',
    keywords: [
      'mensajeria externa',
      'envio de whatsapp',
      'envio de correo',
      'comunicacion multicanal',
      'proveedores de comunicacion',
      'notificaciones salientes',
    ],
  },
  {
    id: 'engine:ai-fallback-cascade-sub-engines-image-gen',
    path: 'ai-fallback-cascade/sub-engines/image-gen',
    keywords: [
      'generacion de imagen',
      'prompt visual',
      'render de imagen',
      'proveedor de imagen ia',
      'salida grafica',
      'respaldo de generacion visual',
    ],
  },
  {
    id: 'engine:ai-orchestrator-engine',
    path: 'ai-orchestrator-engine',
    keywords: [
      'orquestacion de ia',
      'clasificacion de intencion',
      'navegacion inteligente',
      'seleccion de modelo',
      'enrutamiento de consultas',
      'resolucion de contexto',
      'control de turno conversacional',
    ],
  },
  {
    id: 'engine:bot-engine',
    path: 'bot-engine',
    keywords: [
      'gestion de bots',
      'estado del bot',
      'propietario del bot',
      'ciclo de vida del bot',
      'activacion de asistente',
      'salud del bot',
    ],
  },
  {
    id: 'engine:dom-engine',
    path: 'dom-engine',
    keywords: [
      'motor dom',
      'analisis normativo',
      'formularios municipales',
      'tramites de edificacion',
      'validacion de expediente',
      'soporte regulatorio',
    ],
  },
  {
    id: 'engine:dom-engine-sub-engines-form-generator',
    path: 'dom-engine/sub-engines/form-generator',
    keywords: [
      'generador de formulario municipal',
      'formulario minvu',
      'borrador de formulario',
      'datos de obra',
      'comuna y region',
      'documento de postulacion',
    ],
  },
  {
    id: 'engine:dom-engine-sub-engines-normative-analyzer',
    path: 'dom-engine/sub-engines/normative-analyzer',
    keywords: [
      'analizador normativo',
      'factibilidad del proyecto',
      'evaluacion urbanistica',
      'restricciones de uso',
      'cumplimiento regulatorio',
      'resultado de analisis dom',
    ],
  },
  {
    id: 'engine:external-bridge-engine',
    path: 'external-bridge-engine',
    keywords: [
      'puente de integraciones',
      'conexion con proveedores',
      'sincronizacion externa',
      'estado de conectores',
      'monitoreo de integraciones',
      'salud de servicios externos',
    ],
  },
  {
    id: 'engine:finance-engine',
    path: 'finance-engine',
    keywords: [
      'motor financiero',
      'movimientos de cuenta',
      'saldo y conciliacion',
      'facturacion',
      'pagos',
      'cuenta bancaria',
      'estado de cuenta',
      'registro contable',
    ],
  },
  {
    id: 'engine:finance-engine-sub-engines-billing',
    path: 'finance-engine/sub-engines/billing',
    keywords: [
      'emision de factura',
      'folio de facturacion',
      'cliente y cobro',
      'documento tributario',
      'resumen de venta',
      'factura por transaccion',
    ],
  },
  {
    id: 'engine:finance-engine-sub-engines-payments',
    path: 'finance-engine/sub-engines/payments',
    keywords: [
      'checkout de pago',
      'link de pago',
      'cobro en linea',
      'pasarela de pago',
      'procesar pago',
      'orden de cobro',
    ],
  },
  {
    id: 'engine:finance-engine-sub-engines-reconciliation',
    path: 'finance-engine/sub-engines/reconciliation',
    keywords: [
      'conciliacion bancaria',
      'movimientos bancarios',
      'balance de cuenta',
      'abonos y cargos',
      'cuadre financiero',
      'sincronizar cartola',
    ],
  },
  {
    id: 'engine:forecast-core',
    path: 'forecast-core',
    keywords: [
      'proyeccion financiera',
      'pronostico de liquidez',
      'escenario de caja',
      'saldo proyectado',
      'estimacion mensual',
      'riesgo de caja',
    ],
  },
  {
    id: 'engine:forecast-core-sub-engines-cashflow-liquidity',
    path: 'forecast-core/sub-engines/cashflow-liquidity',
    keywords: [
      'proyeccion de flujo de caja',
      'liquidez a futuro',
      'balance proyectado',
      'riesgo de saldo negativo',
      'promedio diario neto',
      'horizonte de 30 dias',
    ],
  },
  {
    id: 'engine:system-engine',
    path: 'system-engine',
    keywords: [
      'motor de sistema',
      'estado del entorno',
      'operacion interna',
      'eventos de sistema',
      'administracion de entorno',
      'control tecnico',
    ],
  },
  {
    id: 'engine:system-engine-sub-engines-env-manager',
    path: 'system-engine/sub-engines/env-manager',
    keywords: [
      'gestion de variables de entorno',
      'revision de configuracion',
      'seguridad de entorno',
      'registro de cambios',
      'auditoria de entorno',
      'control de acceso de entorno',
    ],
  },
  {
    id: 'engine:system-health',
    path: 'system-health',
    keywords: [
      'salud del sistema',
      'latencia',
      'pulso de servicios',
      'estado de dependencias',
      'monitoreo tecnico',
      'alertas operativas',
      'diagnostico general',
    ],
  },
];

/** Manifiestos de módulos (Ley §33) — auto-descubrimiento para el orquestador agéntico. */
export const FIFER_MODULE_MANIFESTS: FiferModuleManifest[] = [
  finanzasManifest,
  afiliadosManifest,
  redesSocialesManifest,
  systemWarRoomManifest,
];

function isAdminUserRole(userRole: string): boolean {
  const r = userRole.trim().toLowerCase();
  return r === 'admin' || r === 'administrador';
}

function formatModuleContextLine(m: FiferModuleManifest): string {
  const parts = [
    `[moduleId] ${m.moduleId}`,
    `[name] ${m.name}`,
    `[preferredUI] ${m.preferredUI}`,
    `[accessLevel] ${m.accessLevel}`,
    `[keywords] ${m.keywords.join(', ')}`,
  ];
  if (m.disambiguationPrompt?.trim()) {
    parts.push(`[disambiguationPrompt] ${m.disambiguationPrompt.trim()}`);
  }
  return parts.join('\n');
}

/**
 * Contexto textual para inyectar en el system prompt del clasificador:
 * filtra por rol (módulos `admin` solo visibles a administradores).
 */
export function getAvailableModulesContext(userRole: string): string {
  const filtered = FIFER_MODULE_MANIFESTS.filter((m) => {
    if (m.accessLevel === 'admin') return isAdminUserRole(userRole);
    return true;
  });
  if (filtered.length === 0) {
    return '(No hay módulos disponibles para este rol.)';
  }
  return filtered.map(formatModuleContextLine).join('\n\n---\n\n');
}

/** IDs de widgets visuales declarados en el manifiesto del módulo (orquestador / overlay). */
export function getVisualWidgetsForModule(
  moduleId: string | null | undefined,
): string[] {
  if (moduleId == null || moduleId === '') return [];
  const m = FIFER_MODULE_MANIFESTS.find((x) => x.moduleId === moduleId);
  const w = m?.visualWidgets;
  if (!Array.isArray(w)) return [];
  return w.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

/** Ruta de app bajo el locale (sin segmento inicial de locale). */
export const MODULE_ID_TO_APP_PATH: Record<string, string> = {
  'finance-core': 'finanzas',
  'affiliates-beauty': 'afiliados',
  'social-media-core': 'redes-sociales',
  'system-telemetry-war-room': 'desarrollador',
};
