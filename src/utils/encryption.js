const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM

function readMasterKey() {
  const raw = String(process.env.ENCRYPTION_KEY || "").trim().toLowerCase();
  if (!raw) {
    throw new Error(
      "[encryption] ENCRYPTION_KEY no configurada. Debe ser 64 caracteres hex (32 bytes)."
    );
  }
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error(
      "[encryption] ENCRYPTION_KEY inválida. Se requieren exactamente 64 caracteres hex (32 bytes)."
    );
  }
  return Buffer.from(raw, "hex");
}

function encrypt(text) {
  const key = readMasterKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // formato: ivHex:tagHex:dataHex
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(hash) {
  const key = readMasterKey();
  const input = String(hash || "").trim();
  const parts = input.split(":");
  if (parts.length !== 3) {
    throw new Error("[encryption] payload cifrado inválido.");
  }
  const [ivHex, tagHex, dataHex] = parts;
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("[encryption] payload cifrado incompleto.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}

module.exports = {
  encrypt,
  decrypt,
  readMasterKey,
};

/*
// Prueba rápida manual (comentar/descomentar localmente):
// process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
// const src = "mi_api_key_super_secreta";
// const enc = encrypt(src);
// const dec = decrypt(enc);
// console.log({ src, enc, dec, ok: src === dec });
*/

