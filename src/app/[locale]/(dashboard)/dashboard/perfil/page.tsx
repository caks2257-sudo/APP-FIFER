import FiferIsotypeMark from '@/components/branding/FiferIsotypeMark';
import ProfileExpedienteForm from '@/components/perfil/ProfileExpedienteForm';

export default function PerfilPage() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-4 border-b border-[#1E293B] pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <FiferIsotypeMark />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#F9FAFB]">
                Perfil profesional
              </h1>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Expediente de identidad — todos los campos son obligatorios para conformación de expedientes.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        className="rounded-xl border border-[#1E293B] bg-[#0A0F1E] p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.4)] ring-1 ring-[#1E293B]/80"
        aria-labelledby="perfil-expediente-heading"
      >
        <h2 id="perfil-expediente-heading" className="sr-only">
          Datos del expediente
        </h2>
        <ProfileExpedienteForm />
      </section>
    </div>
  );
}
