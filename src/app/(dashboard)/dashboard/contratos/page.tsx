import { redirect } from 'next/navigation';

/** Compat: URL histórica /dashboard/contratos → ruta canónica /contratos (grupo `(dashboard)`). */
export default function ContratosLegacyRedirect() {
  redirect('/contratos');
}
