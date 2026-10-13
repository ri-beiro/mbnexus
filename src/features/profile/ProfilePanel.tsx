import { useState, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import {
  setCoverPreset,
  updateProfileDetails,
  uploadAvatar,
  uploadCoverPhoto,
} from "@/repositories/profileRepository";
import { COVER_PRESETS, coverPresetId } from "@/features/profile/coverPresets";
import { ROLE_LABELS } from "@/permissions/types";
import { useToast } from "@/components/ui/toast-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function splitName(fullName: string): { first: string; last: string } {
  const [first = "", ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return { first, last: rest.join(" ") };
}

export function ProfilePanel() {
  const { profile, roles, refresh } = useAuth();
  const { toast } = useToast();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const nameParts = splitName(profile?.full_name ?? "");
  const [firstName, setFirstName] = useState(nameParts.first);
  const [lastName, setLastName] = useState(nameParts.last);
  const [teamsUrl, setTeamsUrl] = useState(profile?.teams_url ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsapp_number ?? "");
  const [birthday, setBirthday] = useState(profile?.birthday ?? "");

  function validateImage(file: File): boolean {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione um arquivo de imagem", variant: "destructive" });
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "A imagem deve ter até 5 MB", variant: "destructive" });
      return false;
    }
    return true;
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile || !validateImage(file)) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatar(profile.id, file);
      await refresh();
      toast({ title: "Foto de perfil atualizada", variant: "success" });
    } catch (err) {
      toast({
        title: "Não foi possível atualizar a foto de perfil",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile || !validateImage(file)) return;
    setUploadingCover(true);
    try {
      await uploadCoverPhoto(profile.id, file);
      await refresh();
      toast({ title: "Foto de capa atualizada", variant: "success" });
    } catch (err) {
      toast({
        title: "Não foi possível atualizar a foto de capa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
    }
  }

  async function handlePickPreset(presetId: string) {
    if (!profile) return;
    setApplyingPreset(presetId);
    try {
      await setCoverPreset(profile.id, presetId);
      await refresh();
      toast({ title: "Capa atualizada", variant: "success" });
    } catch (err) {
      toast({
        title: "Não foi possível aplicar a capa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setApplyingPreset(null);
    }
  }

  async function handleSaveName() {
    if (!profile) return;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) return;
    setSavingName(true);
    try {
      await updateProfileDetails(profile.id, { fullName });
      await refresh();
      toast({ title: "Nome atualizado", variant: "success" });
    } catch (err) {
      toast({
        title: "Não foi possível atualizar o nome",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveContact() {
    if (!profile) return;
    setSavingContact(true);
    try {
      await updateProfileDetails(profile.id, {
        teamsUrl: teamsUrl.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        birthday: birthday || null,
      });
      await refresh();
      toast({ title: "Contato atualizado", variant: "success" });
    } catch (err) {
      toast({
        title: "Não foi possível atualizar o contato",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingContact(false);
    }
  }

  if (!profile) return null;

  const activePresetId = coverPresetId(profile.cover_url);
  const activePreset = COVER_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div className="space-y-5">
      <div className="neu-surface neu-fade-up overflow-hidden">
        <div
          className="neu-sunken relative h-36 bg-cover bg-center sm:h-48"
          style={{
            backgroundImage: activePreset
              ? activePreset.gradient
              : profile.cover_url
                ? `url(${profile.cover_url})`
                : undefined,
          }}
        >
          <label
            htmlFor="profile-cover-upload"
            className="neu-surface-sm neu-surface-hover absolute bottom-3 right-3 flex h-9 w-9 cursor-pointer items-center justify-center text-[var(--neu-text-secondary)]"
          >
            {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </label>
          <input
            id="profile-cover-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Alterar foto de capa"
            disabled={uploadingCover}
            onChange={handleCoverChange}
          />
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative -mt-16 shrink-0 sm:-mt-20">
            <Avatar className="neu-surface-sm h-20 w-20 border-4 border-[var(--neu-surface-from)] sm:h-24 sm:w-24">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
              <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="profile-avatar-upload"
              className={cn(
                "neu-surface-sm neu-surface-hover absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center text-[var(--neu-text-secondary)]",
              )}
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </label>
            <input
              id="profile-avatar-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Alterar foto de perfil"
              disabled={uploadingAvatar}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="truncate text-base font-semibold">{profile.full_name}</p>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.length === 0 && <Badge variant="secondary">Sem papel atribuído</Badge>}
              {roles.map((r) => (
                <Badge key={`${r.roleId}-${r.scopeId ?? "global"}`} variant="outline">
                  {ROLE_LABELS[r.key]}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--neu-divider)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">
            Capas pré-carregadas
          </p>
          <div className="flex flex-wrap gap-2">
            {COVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.label}
                title={preset.label}
                disabled={applyingPreset !== null}
                onClick={() => handlePickPreset(preset.id)}
                className={cn(
                  "h-9 w-14 shrink-0 rounded-xl border-2 transition-transform hover:scale-105",
                  activePreset?.id === preset.id ? "border-[var(--neu-lime-solid)]" : "border-transparent",
                )}
                style={{ backgroundImage: preset.gradient }}
              >
                {applyingPreset === preset.id && <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="neu-surface neu-fade-up space-y-3 p-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">
          Nome
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-first-name">Nome</Label>
            <Input id="profile-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-last-name">Sobrenome</Label>
            <Input id="profile-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <Button type="button" size="sm" onClick={handleSaveName} disabled={savingName || !firstName.trim()}>
          {savingName && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Salvar nome
        </Button>
      </div>

      <div className="neu-surface neu-fade-up space-y-3 p-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">
          Contato e data de nascimento
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-teams-url">Link do Teams</Label>
            <Input
              id="profile-teams-url"
              placeholder="https://teams.microsoft.com/l/..."
              value={teamsUrl}
              onChange={(e) => setTeamsUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-whatsapp">Número do WhatsApp</Label>
            <Input
              id="profile-whatsapp"
              placeholder="+55 11 99999-0000"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-birthday">Data de nascimento</Label>
            <Input id="profile-birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
        </div>
        <Button type="button" size="sm" onClick={handleSaveContact} disabled={savingContact}>
          {savingContact && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Salvar contato
        </Button>
      </div>
    </div>
  );
}
