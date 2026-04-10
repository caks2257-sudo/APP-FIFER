/**
 * Cifrado local AES-GCM para secretos BYOK antes de persistir en `localStorage`
 * (alineado a `v0_pack/04_INTEGRATIONS_HEALTH.md`: credenciales vía vault / `user_api_keys` en backend;
 * en cliente, solo ciphertext).
 */
const PBKDF2_ITERATIONS = 120_000;
const VAULT_KDF_SALT = new TextEncoder().encode("fifer-aivault-v1-kdf-salt");

function getPepper(): string {
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FIFER_VAULT_PEPPER : undefined;
  return (
    fromEnv?.trim() ||
    "FIFER_DEV_VAULT_PEPPER_UNSAFE_SET_NEXT_PUBLIC_FIFER_VAULT_PEPPER_IN_PRODUCTION"
  );
}

function toB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  if (typeof btoa !== "undefined") return btoa(s);
  const B = typeof globalThis !== "undefined" ? (globalThis as { Buffer?: typeof Buffer }).Buffer : undefined;
  if (!B) throw new Error("vault-crypto: no hay btoa/Buffer para base64");
  return B.from(u8).toString("base64");
}

function fromB64(b64: string): Uint8Array {
  if (typeof atob !== "undefined") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const B = typeof globalThis !== "undefined" ? (globalThis as { Buffer?: typeof Buffer }).Buffer : undefined;
  if (!B) throw new Error("vault-crypto: no hay atob/Buffer para base64");
  return Uint8Array.from(B.from(b64, "base64"));
}

async function deriveAesKey(pepper: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", enc.encode(pepper), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: VAULT_KDF_SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Payload serializado persistido (una entrada por motor / boxId). */
export type VaultCipherPayload = {
  v: 1;
  iv: string;
  ct: string;
};

export async function encryptVaultSecret(plaintext: string): Promise<string> {
  const key = await deriveAesKey(getPepper());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, enc.encode(plaintext)),
  );
  const payload: VaultCipherPayload = { v: 1, iv: toB64(iv), ct: toB64(ct) };
  return JSON.stringify(payload);
}

export async function decryptVaultSecret(serialized: string): Promise<string> {
  const parsed = JSON.parse(serialized) as VaultCipherPayload;
  if (parsed.v !== 1 || typeof parsed.iv !== "string" || typeof parsed.ct !== "string") {
    throw new Error("vault: formato de ciphertext inválido");
  }
  const key = await deriveAesKey(getPepper());
  const iv = new Uint8Array(fromB64(parsed.iv));
  const ct = new Uint8Array(fromB64(parsed.ct));
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(buf);
}
