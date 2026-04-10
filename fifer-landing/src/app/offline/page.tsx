export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0f1e] px-6 text-center text-zinc-100">
      <h1 className="text-xl font-semibold tracking-tight">Sin conexión</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">
        FIFER sigue disponible en modo local. Las notas y acciones se guardan en
        el dispositivo y se sincronizarán cuando vuelva la señal.
      </p>
    </main>
  );
}
