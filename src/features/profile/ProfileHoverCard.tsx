import { MessageCircle, Video } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface HoverableProfile {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  teams_url: string | null;
  whatsapp_number: string | null;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}`;
}

interface ProfileHoverCardProps {
  profile: HoverableProfile;
  children: React.ReactNode;
}

/** Wraps an avatar trigger with a Teams-presence-style mini contact card
 * shown on hover, so coworkers can reach someone's Teams/WhatsApp without
 * opening their full profile. */
export function ProfileHoverCard({ profile, children }: ProfileHoverCardProps) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex items-center gap-3">
          <Avatar className="neu-surface-sm h-11 w-11">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
            <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.full_name}</p>
            {profile.job_title && <p className="truncate text-xs text-muted-foreground">{profile.job_title}</p>}
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        {(profile.teams_url || profile.whatsapp_number) && (
          <div className="mt-3 flex gap-2 border-t border-[var(--neu-divider)] pt-3">
            {profile.teams_url && (
              <a
                href={profile.teams_url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "neu-sunken flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--neu-text-secondary)] hover:text-[var(--neu-lime-solid)]",
                )}
              >
                <Video className="h-3.5 w-3.5" /> Teams
              </a>
            )}
            {profile.whatsapp_number && (
              <a
                href={whatsappHref(profile.whatsapp_number)}
                target="_blank"
                rel="noreferrer"
                className="neu-sunken flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--neu-text-secondary)] hover:text-[var(--neu-lime-solid)]"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
