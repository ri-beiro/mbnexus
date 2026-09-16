import { supabase } from "@/lib/supabase";
import type { EmailTemplate } from "@/types/database";

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase.from("email_templates").select("*").order("key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmailTemplate[];
}

export interface CreateEmailTemplateInput {
  organizationId: string;
  key: string;
  subject: string;
  bodyHtml: string;
}

export async function createEmailTemplate(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      organization_id: input.organizationId,
      key: input.key,
      subject: input.subject,
      body_html: input.bodyHtml,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EmailTemplate;
}

export interface UpdateEmailTemplateInput {
  subject?: string;
  bodyHtml?: string;
}

const UPDATE_EMAIL_TEMPLATE_KEYS: Record<keyof UpdateEmailTemplateInput, string> = {
  subject: "subject",
  bodyHtml: "body_html",
};

export async function updateEmailTemplate(templateId: string, patch: UpdateEmailTemplateInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_EMAIL_TEMPLATE_KEYS) as [
    keyof UpdateEmailTemplateInput,
    string,
  ][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("email_templates").update(payload).eq("id", templateId);
  if (error) throw error;
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from("email_templates").delete().eq("id", templateId);
  if (error) throw error;
}
