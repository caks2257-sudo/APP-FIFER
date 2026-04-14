import type { FiferModuleManifest } from '@/registry/manifest';

export const finanzasManifest: FiferModuleManifest = {
  moduleId: 'finance-core',
  name: 'Finanzas Core',
  description:
    'Gestiona saldos, movimientos, proyecciones y sincronizacion bancaria para la operacion financiera diaria.',
  keywords: [
    'banco',
    'saldo',
    'flujo de caja',
    'sii',
    'fintoc',
    'ingresos',
    'egresos',
    'cartola',
    'proyectado',
  ],
  accessLevel: 'user',
  preferredUI: 'DASHBOARD_WIDGET',
  visualWidgets: ['BankConnectionWidget', 'CashFlowWidget'],
};

export default finanzasManifest;
