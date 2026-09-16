// Cron-triggered Edge Function (docs/architecture.md section 8): drains
// `email_queue`, sending each pending row through whichever EmailProvider is
// configured, so app requests never block on SMTP/Graph round trips.
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { resolveEmailProvider } from "../_shared/emailProvider.ts";

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;

interface EmailQueueRow {
  id: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  attempts: number;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createAdminClient();
  const provider = resolveEmailProvider();

  const { data: pending, error } = await supabase
    .from("email_queue")
    .select("id, recipient_email, subject, body_html, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const email of (pending ?? []) as EmailQueueRow[]) {
    await supabase.from("email_queue").update({ status: "sending" }).eq("id", email.id);

    try {
      await provider.send({ to: email.recipient_email, subject: email.subject, html: email.body_html });
      await supabase
        .from("email_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email.id);
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = email.attempts + 1;
      await supabase
        .from("email_queue")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          last_error: message,
        })
        .eq("id", email.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed: (pending ?? []).length, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
