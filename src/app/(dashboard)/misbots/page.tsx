import { ApiKeyManager } from '@/components/fifer/ApiKeyManager';
import { DocumentUploader } from '@/components/fifer/DocumentUploader';
import FiferMisbotsMain from '@/components/v0-ingestion/boxes/FiferMisbotsMain';
import { supabaseAdmin } from '@/lib/supabase';

export default async function MisbotsPage() {
  const { data: bots, error } = await supabaseAdmin.from('Bot').select('*');

  if (error) {
    throw new Error(`Mis Bots: no se pudo leer la tabla Bot (${error.message})`);
  }

  const rows = bots ?? [];

  return (
    <>
      <section
        className="mb-6 rounded-xl border border-[#334155]/80 bg-[#0A0F1E]/60 px-4 py-5 md:px-6"
        aria-labelledby="misbots-doc-uploader-heading"
      >
        <h2
          id="misbots-doc-uploader-heading"
          className="mb-4 text-base font-semibold tracking-tight text-[#F9FAFB]"
        >
          Gestor de Documentos (Test)
        </h2>
        <div className="max-w-2xl">
          <DocumentUploader mainApp="misbots" />
        </div>
      </section>
      <section className="mb-6" aria-label="Gestor de llaves API internas">
        <ApiKeyManager />
      </section>
      {/* Const. v6.0 — inmunidad: el circuito registra fallos con boxCircuitBreaker.recordFailure (p. ej. useBoxData / shells de box). */}
      <FiferMisbotsMain data={{}} initialBots={rows} />
    </>
  );
}
