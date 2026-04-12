import type { BridgeConnectionCategory, BridgeIntegrationId } from './keys';
import type { ResolvedKey } from './bridge-proxy';

/**
 * Estado público por integración Bridge (adaptadores estáticos).
 * `integrationId` ampliable a `discovered:*` en respuestas unificadas.
 */
export type IntegrationPublicStatus = {
  integrationId: BridgeIntegrationId | string;
  envKey: string;
  label: string;
  category: BridgeConnectionCategory;
  mode: 'MOCK' | 'PROD';
  source: ResolvedKey['source'];
};

export type UnifiedIntegrationPublicStatus = IntegrationPublicStatus & {
  iconKey: string;
  groupId?: string;
  groupLabel?: string;
  fromDiscovery?: boolean;
};
