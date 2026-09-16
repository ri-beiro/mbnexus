// EmailProvider abstraction (docs/architecture.md section 8): the queue
// processor talks to this interface only, so swapping Locaweb SMTP for
// Microsoft Graph — or back — never touches business logic.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { requiredEnv } from "./supabaseAdmin.ts";
import { getGraphAppToken } from "./graphAuth.ts";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Sends mail as an application (client-credentials), from a fixed shared
 * mailbox — matches the app-only Graph consent flow used for meetings
 * (docs/architecture.md section 7), not delegated per-user auth. */
export class MicrosoftGraphEmailProvider implements EmailProvider {
  constructor(
    private readonly tenantId: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly senderUpn: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const token = await getGraphAppToken(this.tenantId, this.clientId, this.clientSecret);
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${this.senderUpn}/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject: message.subject,
          body: { contentType: "HTML", content: message.html },
          toRecipients: [{ emailAddress: { address: message.to } }],
        },
        saveToSentItems: false,
      }),
    });
    if (!response.ok) {
      throw new Error(`Falha ao enviar e-mail via Microsoft Graph: ${response.status} ${await response.text()}`);
    }
  }
}

export class LocawebSMTPProvider implements EmailProvider {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly username: string,
    private readonly password: string,
    private readonly fromAddress: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const client = new SMTPClient({
      connection: {
        hostname: this.host,
        port: this.port,
        tls: true,
        auth: { username: this.username, password: this.password },
      },
    });
    try {
      await client.send({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
      });
    } finally {
      await client.close();
    }
  }
}

/** Picks the active provider from the `EMAIL_PROVIDER` secret
 * ("locaweb_smtp" | "microsoft_graph"), defaulting to Locaweb since that's
 * the org's primary mailbox per the master prompt. */
export function resolveEmailProvider(): EmailProvider {
  const providerName = Deno.env.get("EMAIL_PROVIDER") ?? "locaweb_smtp";

  if (providerName === "microsoft_graph") {
    return new MicrosoftGraphEmailProvider(
      requiredEnv("MS_TENANT_ID"),
      requiredEnv("MS_CLIENT_ID"),
      requiredEnv("MS_CLIENT_SECRET"),
      requiredEnv("MS_SENDER_UPN"),
    );
  }

  return new LocawebSMTPProvider(
    requiredEnv("LOCAWEB_SMTP_HOST"),
    Number(Deno.env.get("LOCAWEB_SMTP_PORT") ?? "465"),
    requiredEnv("LOCAWEB_SMTP_USER"),
    requiredEnv("LOCAWEB_SMTP_PASSWORD"),
    requiredEnv("LOCAWEB_SMTP_FROM"),
  );
}
