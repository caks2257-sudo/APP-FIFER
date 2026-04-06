const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY || "awg9kjvmfmp4arrb";
  const scope = "user.info.basic,video.upload,video.publish";

  const params = new URLSearchParams({
    client_key: clientKey,
    scope,
    redirect_uri: 'https://fifer-landing.vercel.app/api/tiktok/callback',
    response_type: "code",
    state: "fifer_tiktok_connect",
  });

  const authUrl = `${TIKTOK_AUTH_BASE}?${params.toString()}`;
  return Response.redirect(authUrl);
}
