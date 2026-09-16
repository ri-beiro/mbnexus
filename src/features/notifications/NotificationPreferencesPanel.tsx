import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { getNotificationPreferences, updateNotificationPreferences } from "@/repositories/notificationRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationPreference } from "@/types/database";

const DEFAULT_PREFS: Omit<NotificationPreference, "profile_id" | "updated_at"> = {
  in_app_enabled: true,
  email_enabled: true,
};

export function NotificationPreferencesPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);

  const profileId = profile?.id;

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    getNotificationPreferences(profileId)
      .then((existing) => setPrefs(existing ?? { profile_id: profileId, updated_at: "", ...DEFAULT_PREFS }))
      .finally(() => setLoading(false));
  }, [profileId]);

  async function handleToggle(field: "inAppEnabled" | "emailEnabled", value: boolean) {
    if (!profile || !prefs) return;
    const previous = prefs;
    const column = field === "inAppEnabled" ? "in_app_enabled" : "email_enabled";
    setPrefs({ ...prefs, [column]: value });
    try {
      const updated = await updateNotificationPreferences(profile.id, { [field]: value });
      setPrefs(updated);
    } catch (err) {
      setPrefs(previous);
      toast({
        title: "Não foi possível salvar a preferência",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  if (loading || !prefs) {
    return <Skeleton className="h-24" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <Label htmlFor="pref-in-app">Notificações no aplicativo</Label>
          <p className="text-xs text-muted-foreground">Sino no topo e central de notificações.</p>
        </div>
        <input
          id="pref-in-app"
          type="checkbox"
          checked={prefs.in_app_enabled}
          onChange={(e) => handleToggle("inAppEnabled", e.target.checked)}
          className="h-4 w-4"
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <Label htmlFor="pref-email">Notificações por e-mail</Label>
          <p className="text-xs text-muted-foreground">Envio via Microsoft Graph / SMTP Locaweb.</p>
        </div>
        <input
          id="pref-email"
          type="checkbox"
          checked={prefs.email_enabled}
          onChange={(e) => handleToggle("emailEnabled", e.target.checked)}
          className="h-4 w-4"
        />
      </div>
    </div>
  );
}
