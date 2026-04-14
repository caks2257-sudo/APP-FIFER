import type { FiferModuleManifest } from '@/registry/manifest';

export const systemWarRoomManifest: FiferModuleManifest = {
  moduleId: 'system-telemetry-war-room',
  name: 'Sala de guerra — telemetria del sistema',
  description:
    'Monitoreo administrativo: latencia, logs, estado de APIs y salud del ecosistema FIFER.',
  keywords: [
    'monitoreo',
    'latencia',
    'logs',
    'errores',
    'sistema',
    'apis',
    'estado de fifer',
  ],
  accessLevel: 'admin',
  preferredUI: 'SYSTEM_WAR_ROOM',
};

export default systemWarRoomManifest;
