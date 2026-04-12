import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm' as const;

function getMasterKeyBuffer(): Buffer | null {
  const raw = process.env.FIFER_BRIDGE_MASTER_KEY?.trim();
  if (!raw || raw.length !== 64) return null;
  try {
    return Buffer.from(raw, 'hex');
  } catch {
    return null;
  }
}

export function isBridgeMasterKeyConfigured(): boolean {
  return getMasterKeyBuffer() != null;
}

export type EncPayload = {
  ciphertextB64: string;
  ivB64: string;
  authTagB64: string;
};

export function encryptSecret(plain: string): EncPayload | null {
  const key = getMasterKeyBuffer();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertextB64: enc.toString('base64'),
    ivB64: iv.toString('base64'),
    authTagB64: tag.toString('base64'),
  };
}

export function decryptSecret(payload: EncPayload): string | null {
  const key = getMasterKeyBuffer();
  if (!key) return null;
  try {
    const iv = Buffer.from(payload.ivB64, 'base64');
    const tag = Buffer.from(payload.authTagB64, 'base64');
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertextB64, 'base64')),
      decipher.final(),
    ]);
    return out.toString('utf8');
  } catch {
    return null;
  }
}
