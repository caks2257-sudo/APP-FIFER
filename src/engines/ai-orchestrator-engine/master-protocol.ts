import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';

const MASTER_DOC_BASENAME = 'FIFER — AI ORCHESTRATION SUB-APP MASTER DOCUMENT.txt';
const GCS_BUCKET_NAME = process.env.FIFER_PROTOCOL_BUCKET || 'fifer-master-protocol-bucket';

let cached: string | null = null;
let storage: Storage | null = null;

/**
 * Carga el documento maestro AODS.
 * Prioriza Google Cloud Storage (Cloud Code). Fallback a disco local (Cursor).
 */
export async function loadMasterProtocolText(): Promise<string> {
  if (cached !== null) return cached;

  // 1. Intento Cloud (Producción / GCP)
  try {
    if (!storage) storage = new Storage();
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const file = bucket.file(MASTER_DOC_BASENAME);

    const [contents] = await file.download();
    cached = contents.toString('utf8');

    console.log(`[FIFER Orquestador] Protocolo Maestro cargado exitosamente desde Cloud Storage.`);
    return cached;
  } catch (cloudError) {
    console.warn(`[FIFER Orquestador] No se pudo leer desde GCS. Intentando Fallback local...`);
  }

  // 2. Fallback Local (Desarrollo en Cursor)
  try {
    const filePath = path.join(process.cwd(), MASTER_DOC_BASENAME);
    cached = fs.readFileSync(filePath, 'utf8');

    console.log(`[FIFER Orquestador] Protocolo Maestro cargado desde disco local (Fallback).`);
  } catch (localError) {
    console.error(`[FIFER Orquestador] Error crítico: No se pudo cargar el protocolo de ninguna fuente.`);
    cached = ''; // Falla segura
  }

  return cached;
}
