/**
 * Rompecircuitos en memoria (cliente) para la API de contratos Chicureo — §0.25.
 */

import { registerBoxCircuit } from '@/utils/box-circuit-breaker';

const FAILURE_THRESHOLD = 3;
const OPEN_MS = 45_000;

export const CONTRACTS_CHICUREO_API_CIRCUIT_ID = 'contracts-chicureo-api';

const CIRCUIT_ID = CONTRACTS_CHICUREO_API_CIRCUIT_ID;

let consecutiveFailures = 0;
let blockedUntil = 0;

export function recordFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    blockedUntil = Date.now() + OPEN_MS;
  }
}

export function recordSuccess(): void {
  consecutiveFailures = 0;
  blockedUntil = 0;
}

export function resetContractsChicureoCircuit(): void {
  consecutiveFailures = 0;
  blockedUntil = 0;
}

export function isContractsCircuitOpen(): boolean {
  const now = Date.now();
  if (now < blockedUntil) return true;
  if (blockedUntil > 0 && now >= blockedUntil) {
    blockedUntil = 0;
    consecutiveFailures = 0;
  }
  return false;
}

registerBoxCircuit({
  id: CIRCUIT_ID,
  isOpen: isContractsCircuitOpen,
  reset: resetContractsChicureoCircuit,
  recordFailure,
});
