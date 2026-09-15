import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/useAuth";

/** Unread notification count for the topbar bell, kept live via Realtime. */
export function useNotificationsBadge() {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profile) {
      setCount(0);
      return;
    }

    let cancelled = false;

    async function loadCount() {
      const { count: total, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile!.id)
        .eq("is_read", false);
      if (!error && !cancelled) setCount(total ?? 0);
    }

    loadCount();

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `profile_id=eq.${profile.id}` },
        () => loadCount(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return count;
}
