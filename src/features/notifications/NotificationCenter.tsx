import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useNotificationsBadge } from "@/features/notifications/useNotificationsBadge";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/repositories/notificationRepository";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/database";

export function NotificationCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useNotificationsBadge();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function reload() {
    setLoading(true);
    try {
      setNotifications(await listNotifications());
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) reload();
  }

  async function handleItemClick(notification: Notification) {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    }
    setOpen(false);
    if (notification.link_url) navigate(notification.link_url);
  }

  async function handleMarkAllAsRead() {
    if (!profile) return;
    await markAllNotificationsAsRead(profile.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Notificações</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1.5 py-0.5 text-xs"
            onClick={handleMarkAllAsRead}
            disabled={!hasUnread}
          >
            Marcar todas como lidas
          </Button>
        </div>
        <DropdownMenuSeparator className="mx-0" />

        {loading && <p className="px-3 py-6 text-center text-xs text-muted-foreground">Carregando…</p>}

        {!loading && notifications.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma notificação por aqui.</p>
        )}

        {!loading && notifications.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1">
            {notifications.map((notification) => (
              <li key={notification.id} data-testid={`notification-item-${notification.id}`}>
                <button
                  type="button"
                  onClick={() => handleItemClick(notification)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    !notification.is_read && "bg-accent/40",
                  )}
                >
                  {!notification.is_read && (
                    <span
                      data-testid="unread-dot"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <span className={cn("flex-1", notification.is_read && "pl-3.5")}>
                    <span className="block font-medium">{notification.title}</span>
                    {notification.body && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{notification.body}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
