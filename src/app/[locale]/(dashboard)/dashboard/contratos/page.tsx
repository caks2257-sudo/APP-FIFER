import { redirect } from '@/i18n/navigation';

/** Compat: URL histórica /dashboard/contratos → ruta canónica /contratos (grupo `(dashboard)`). */
export default function ContratosLegacyRedirect() {
  redirect({ href: '/contratos' });
}
