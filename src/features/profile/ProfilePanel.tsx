import { useState, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { uploadAvatar, uploadCoverPhoto } from "@/repositories/profileRepository";
import { ROLE_LABELS } from "@/permissions/types";
import { useToast } from "@/components/ui/toast-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export function ProfilePanel() {
  const { profile, roles, refresh } = useAuth();
  const { toast } = useToast();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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

  if (!profile) return null;

  return (
    <div className="neu-surface neu-fade-up overflow-hidden">
      <div
        className="neu-sunken relative h-36 bg-cover bg-center sm:h-48"
        style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}
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
    </div>
  );
}
