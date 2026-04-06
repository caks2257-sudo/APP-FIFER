export async function GET() {
    // Aquí pega el código que está DENTRO de tu archivo .txt
    const content = "tiktok-verify-v1-code-AQUI-DENTRO"; 
    
    return new Response(content, {
      headers: { 
        'Content-Type': 'text/plain',
      },
    });
  }