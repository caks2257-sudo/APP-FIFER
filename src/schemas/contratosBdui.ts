/**
 * @deprecated Preferir `@/schemas/schemas` (`ContratosDataSchema`, `contratosListPayloadSchema`).
 */
export {
  ContratosDataSchema as contratoRowSchema,
  contratosListPayloadSchema as contratosBduiPayloadSchema,
} from './schemas';

export type { ContratosDataRow as ContratoRow, ContratosListPayload as ContratosBduiPayload } from './schemas';
