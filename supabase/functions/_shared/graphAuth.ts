// Shared Microsoft Graph app-only (client-credentials) token helper, used by
// both the email provider (docs/architecture.md section 8) and ms-meetings
// (section 7) — one app registration, `.default` scope, no per-user consent.

interface GraphTokenResponse {
  access_token: string;
}

export async function getGraphAppToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao obter token do Microsoft Graph: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as GraphTokenResponse;
  return data.access_token;
}
