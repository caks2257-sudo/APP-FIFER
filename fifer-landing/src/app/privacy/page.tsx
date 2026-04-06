const PrivacyPage = () => {
  return (
    <section className="max-w-4xl mx-auto px-6 pt-32 pb-20">
      <h1 className="text-4xl font-bold text-foreground">Politica de Privacidad</h1>
      <p className="mt-4 text-foreground-accent">
        En FIFER tratamos la privacidad como prioridad. Esta Politica describe como recopilamos, usamos y protegemos
        informacion relacionada con gestion de afiliados y publicaciones en TikTok.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">Datos que recopilamos</h2>
      <p className="mt-3 text-foreground-accent">
        Podemos recopilar datos de cuenta, identificadores de campaña, metricas de rendimiento, y metadatos de
        publicaciones para operar automatizaciones y seguimiento de conversiones.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Uso de la informacion</h2>
      <p className="mt-3 text-foreground-accent">
        Usamos la informacion para ejecutar flujos automatizados, mejorar estabilidad del servicio, monitorear
        seguridad y cumplir obligaciones legales o contractuales con clientes y partners.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Comparticion y retencion</h2>
      <p className="mt-3 text-foreground-accent">
        Compartimos datos solo cuando es necesario para proveer el servicio (por ejemplo, APIs de TikTok o afiliados).
        Retenemos informacion durante el periodo operativo requerido y conforme a la ley aplicable.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Derechos y contacto</h2>
      <p className="mt-3 text-foreground-accent">
        Puedes solicitar acceso, rectificacion o eliminacion de datos escribiendo a legal@fifer.app.
      </p>
    </section>
  );
};

export default PrivacyPage;
