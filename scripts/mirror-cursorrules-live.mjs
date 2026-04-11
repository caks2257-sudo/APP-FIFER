/**
 * Copia íntegra `.cursorrules` → `v0_pack/templates/14_CURSORRULES_LIVE.md` (espejo para v0 / Gemini).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, '.cursorrules');
const destDir = path.join(root, 'v0_pack', 'templates');
const dest = path.join(destDir, '14_CURSORRULES_LIVE.md');

export function mirrorCursorrulesLive() {
  if (!fs.existsSync(src)) {
    console.warn('[cursorrules-live] No existe .cursorrules en la raíz del proyecto.');
    return false;
  }
  fs.mkdirSync(destDir, { recursive: true });
  const body = fs.readFileSync(src, 'utf8');
  const stamp = new Date().toISOString();
  const out = `<!-- Espejo vivo — generado automáticamente (${stamp}) — fuente: .cursorrules — no editar a mano -->\n\n${body}`;
  fs.writeFileSync(dest, out, 'utf8');
  console.log('[cursorrules-live] Sincronizado → v0_pack/templates/14_CURSORRULES_LIVE.md');
  return true;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  mirrorCursorrulesLive();
}
