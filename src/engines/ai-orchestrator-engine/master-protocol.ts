import fs from 'fs';
import path from 'path';

const MASTER_DOC_BASENAME = 'FIFER — AI ORCHESTRATION SUB-APP MASTER DOCUMENT.txt';

let cached: string | null = null;

/**
 * Lee el documento maestro AODS en la raíz del repo (process.cwd()).
 * Cache en memoria por proceso; vacío si el archivo no existe.
 */
export function loadMasterProtocolText(): string {
  if (cached !== null) return cached;
  const filePath = path.join(process.cwd(), MASTER_DOC_BASENAME);
  try {
    cached = fs.readFileSync(filePath, 'utf8');
  } catch {
    cached = '';
  }
  return cached;
}
