import type { V0BoxProps } from '../box-types';
import ContratosBox from './ContratosBox';

/**
 * Box ADN `fifer-contratos-main` — delega en `ContratosBox` (BaseBoxTemplate + circuitos).
 */
export default function FiferContratosMain(props: V0BoxProps) {
  return <ContratosBox {...props} />;
}
