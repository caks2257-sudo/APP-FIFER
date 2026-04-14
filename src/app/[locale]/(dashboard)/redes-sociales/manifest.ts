import type { FiferModuleManifest } from '@/registry/manifest';

export const redesSocialesManifest: FiferModuleManifest = {
  moduleId: 'social-media-core',
  name: 'Redes sociales',
  description:
    'Crea y gestiona publicaciones y campanas de contenido en redes sociales.',
  keywords: [
    'campaña',
    'belleza',
    'instagram',
    'facebook',
    'publicación',
    'post',
    'redes',
  ],
  accessLevel: 'user',
  preferredUI: 'GUIDED_OVERLAY',
  disambiguationPrompt:
    '¿Esta campaña es para publicar contenido en tus redes sociales o para gestionar comisiones de afiliados?',
};

export default redesSocialesManifest;
