import { useEffect, useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "@/repositories/emailTemplateRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { EmailTemplate } from "@/types/database";

interface TemplateRowProps {
  template: EmailTemplate;
  onSave: (id: string, patch: { subject?: string; bodyHtml?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TemplateRow({ template, onSave, onDelete }: TemplateRowProps) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [saving, setSaving] = useState(false);

  const dirty = subject !== template.subject || bodyHtml !== template.body_html;

  async function handleSave() {
    setSaving(true);
    try {
      const patch: { subject?: string; bodyHtml?: string } = {};
      if (subject !== template.subject) patch.subject = subject;
      if (bodyHtml !== template.body_html) patch.bodyHtml = bodyHtml;
      await onSave(template.id, patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li data-testid={`template-row-${template.id}`} className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{template.key}</p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Excluir ${template.key}`}
          onClick={() => onDelete(template.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto…" />
      <textarea
        value={bodyHtml}
        onChange={(e) => setBodyHtml(e.target.value)}
        placeholder="Corpo em HTML…"
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
      />
      <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || saving}>
        Salvar
      </Button>
    </li>
  );
}

export function EmailTemplatesPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    try {
      setTemplates(await listEmailTemplates());
    } catch (err) {
      toast({
        title: "Não foi possível carregar os modelos de e-mail",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!key.trim() || !subject.trim() || !bodyHtml.trim() || !profile) return;
    setCreating(true);
    try {
      await createEmailTemplate({
        organizationId: profile.organization_id,
        key: key.trim(),
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
      });
      setKey("");
      setSubject("");
      setBodyHtml("");
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível criar o modelo",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveTemplate(id: string, patch: { subject?: string; bodyHtml?: string }) {
    try {
      await updateEmailTemplate(id, patch);
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível salvar o modelo",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await deleteEmailTemplate(id);
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível excluir o modelo",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap gap-2">
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Chave (ex: tarefa_atrasada)…" disabled={creating} className="max-w-xs" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto…" disabled={creating} className="max-w-xs" />
        </div>
        <textarea
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="Corpo em HTML…"
          rows={3}
          disabled={creating}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
        />
        <Button
          type="button"
          onClick={handleCreate}
          disabled={creating || !key.trim() || !subject.trim() || !bodyHtml.trim()}
        >
          <Mail className="h-4 w-4" /> Criar modelo
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={Mail} title="Nenhum modelo de e-mail cadastrado" description="Crie o primeiro modelo acima." />
      ) : (
        <ul className="space-y-2">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} onSave={handleSaveTemplate} onDelete={handleDeleteTemplate} />
          ))}
        </ul>
      )}
    </div>
  );
}
