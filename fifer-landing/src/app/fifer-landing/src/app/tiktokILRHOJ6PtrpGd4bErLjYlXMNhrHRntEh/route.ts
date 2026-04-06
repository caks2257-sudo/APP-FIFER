import { NextResponse } from 'next/server';

export async function GET() {
  // Abre el archivo .txt que descargaste y pega el código que tiene adentro aquí:
  const content = "EL_CODIGO_QUE_ESTA_DENTRO_DEL_TXT"; 

  return new Response(content, {
    headers: { 
      'Content-Type': 'text/plain',
    },
  });
}