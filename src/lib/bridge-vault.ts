import type { ExternalBridgeCredential } from '@prisma/client';

import { decryptSecret } from '@/lib/bridge-credential-crypto';
import { prisma } from '@/lib/prisma';

/**
 * Mapa envKey → valor en claro para fusionar en BridgeProxy (solo servidor).
 */
export async function loadDecryptedVault(): Promise<Partial<Record<string, string>>> {
  let rows: ExternalBridgeCredential[] = [];
  try {
    rows = await prisma.externalBridgeCredential.findMany();
  } catch {
    return {};
  }
  const out: Partial<Record<string, string>> = {};
  for (const row of rows) {
    const plain = decryptSecret({
      ciphertextB64: row.ciphertextB64,
      ivB64: row.ivB64,
      authTagB64: row.authTagB64,
    });
    if (plain?.trim()) {
      out[row.envKey] = plain.trim();
    }
  }
  return out;
}
