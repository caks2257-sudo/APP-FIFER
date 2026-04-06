export async function GET() {
  const content = "tiktok-developers-site-verification=ILRHOJ6PtrpGd4bErLjYlXMNhrHRntEh";
  return new Response(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
