/**
 * Arranque dev: espejo .cursorrules en vivo + Next.js.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mirrorCursorrulesLive } from './mirror-cursorrules-live.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cursorrulesPath = path.join(root, '.cursorrules');

mirrorCursorrulesLive();

let debounce;
function scheduleMirror() {
  clearTimeout(debounce);
  debounce = setTimeout(() => mirrorCursorrulesLive(), 120);
}

let watcher;
try {
  watcher = fs.watch(cursorrulesPath, scheduleMirror);
} catch {
  console.warn('[cursorrules-live] No se pudo observar .cursorrules (¿falta el archivo?).');
}

const next = spawn('npx', ['next', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

function shutdown(code) {
  if (watcher) watcher.close();
  clearTimeout(debounce);
  process.exit(code ?? 0);
}

next.on('exit', (code) => shutdown(code ?? 0));

process.on('SIGINT', () => {
  next.kill('SIGINT');
  shutdown(0);
});
process.on('SIGTERM', () => {
  next.kill('SIGTERM');
  shutdown(0);
});
