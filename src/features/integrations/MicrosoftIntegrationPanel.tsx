import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { getIntegration, upsertIntegration } from "@/repositories/integrationRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const PROVIDER = "microsoft_365";

export function MicrosoftIntegrationPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [organizerUpn, setOrganizerUpn] = useState("");

  const organizationId = profile?.organization_id;

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    getIntegration(PROVIDER)
      .then((integration) => {
        setIsEnabled(integration?.is_enabled ?? false);
        setOrganizerUpn((integration?.config.organizerUpn as string | undefined) ?? "");
      })
      .finally(() => setLoading(false));
  }, [organizationId]);

  async function handleSave() {
    if (!organizationId) return;
    setSaving(true);
    try {
      await upsertIntegration({
        organizationId,
        provider: PROVIDER,
        isEnabled,
        config: { organizerUpn },
      });
      toast({ title: "Configuração salva", variant: "success" });
    } catch (err) {
      toast({
        title: "Não foi possível salvar a configuração",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-32" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Aplicativo Microsoft Entra ID com permissão de app (client credentials) — sem redirecionamento de login
        por usuário. As credenciais reais (tenant, client id/secret) ficam apenas nas secrets das Edge Functions,
        nunca aqui. Ver <code>supabase/functions/README.md</code>.
      </p>

      <div className="flex items-center gap-2">
        <input
          id="ms-integration-enabled"
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          disabled={saving}
          className="h-4 w-4"
        />
        <Label htmlFor="ms-integration-enabled">Ativar integração Microsoft 365</Label>
      </div>

      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="ms-organizer-upn">E-mail organizador (Teams)</Label>
        <Input
          id="ms-organizer-upn"
          type="email"
          value={organizerUpn}
          onChange={(e) => setOrganizerUpn(e.target.value)}
          placeholder="reunioes@suaorganizacao.com"
          disabled={saving}
        />
      </div>

      <Button type="button" onClick={handleSave} disabled={saving}>
        Salvar
      </Button>
    </div>
  );
}
