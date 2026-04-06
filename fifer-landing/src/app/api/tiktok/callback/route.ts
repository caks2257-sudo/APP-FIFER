import { exchangeAuthorizationCode } from "@/lib/oauth/providers";

const TIKTOK_TOKEN_ENDPOINT = "https://open.tiktokapis.com/v2/oauth/token/";
const APP_BASE_URL = "https://fifer-landing.vercel.app";
const CALLBACK_PATH = "/api/tiktok/callback";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return Response.redirect(`${APP_BASE_URL}/auth/success?status=missing_code`);
  }

  const clientKey =
    process.env.TIKTOK_CLIENT_KEY ||
    process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY ||
    "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET || "";
  const redirectUri = `${APP_BASE_URL}${CALLBACK_PATH}`;

  if (!clientKey || !clientSecret) {
    return Response.redirect(`${APP_BASE_URL}/auth/success?status=missing_secret`);
  }

  const tokenResult = await exchangeAuthorizationCode(
    {
      tokenEndpoint: TIKTOK_TOKEN_ENDPOINT,
      clientKey,
      clientSecret,
      redirectUri,
    },
    code
  );

  if (!tokenResult.ok) {
    return Response.redirect(`${APP_BASE_URL}/auth/success?status=token_error`);
  }

  return Response.redirect(`${APP_BASE_URL}/auth/success`);
}
