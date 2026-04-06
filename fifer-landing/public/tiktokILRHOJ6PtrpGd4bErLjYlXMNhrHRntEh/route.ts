export async function GET() {
    return new Response('EL_CONTENIDO_DEL_ARCHIVO_DE_TIKTOK', {
      headers: { 'content-type': 'text/plain' },
    });
  }