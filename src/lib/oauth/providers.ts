export type OAuthProviderConfig = {
  tokenEndpoint: string;
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
};

export async function exchangeAuthorizationCode(
  config: OAuthProviderConfig,
  code: string
) {
  const body = new URLSearchParams({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = await response.json();
  return { ok: response.ok, payload };
}
