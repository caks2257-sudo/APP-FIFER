const AuthSuccessPage = () => {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-32 pb-24">
      <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground-accent">
          FIFER
        </p>
        <h1 className="mt-3 text-4xl font-bold text-foreground">
          ¡Conexion Exitosa!
        </h1>
        <p className="mt-4 text-lg text-foreground-accent">
          Tu cuenta de TikTok ha sido vinculada correctamente. Ya puedes cerrar esta
          ventana.
        </p>
      </div>
    </section>
  );
};

export default AuthSuccessPage;
