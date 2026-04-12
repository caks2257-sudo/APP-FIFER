import { redirect } from '@/i18n/navigation';

type Props = {
  params: { locale: string };
};

/** Compat: URL histórica /dashboard/contratos → ruta canónica /contratos (grupo `(dashboard)`). */
export default function ContratosLegacyRedirect({ params }: Props) {
  redirect({ href: '/contratos', locale: params.locale });
}
