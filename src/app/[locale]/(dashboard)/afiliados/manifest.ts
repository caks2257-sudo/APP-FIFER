import type { FiferModuleManifest } from '@/registry/manifest';

export const afiliadosManifest: FiferModuleManifest = {
  moduleId: 'affiliates-beauty',
  name: 'Afiliados Belleza',
  description:
    'Coordina campanas de afiliados, referidos y automatizaciones de marketing para ejecucion en tiempo real.',
  keywords: [
    'campaña',
    'belleza',
    'afiliados',
    'referidos',
    'instagram',
    'bot',
    'marketing',
    'crear campaña',
  ],
  accessLevel: 'user',
  preferredUI: 'GUIDED_OVERLAY',
  visualWidgets: ['configuradorCampana'],
  disambiguationPrompt:
    '¿La campaña de belleza estará enfocada en referidos de tu programa de afiliados o en publicación directa en redes sociales?',
};

export default afiliadosManifest;
