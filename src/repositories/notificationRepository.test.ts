import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationPreferences,
} from "@/repositories/notificationRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("listNotifications", () => {
  it("lists notifications for the current profile ordered by newest first", async () => {
    const rows = [{ id: "n1", title: "Tarefa atribuída" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listNotifications();

    expect(from).toHaveBeenCalledWith("notifications");
    expect(mock.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual(rows);
  });

  it("throws when the query fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "boom" } });
    from.mockReturnValue(mock as never);

    await expect(listNotifications()).rejects.toThrow("boom");
  });
});

describe("markNotificationAsRead", () => {
  it("updates a single notification's is_read flag", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await markNotificationAsRead("n1");

    expect(from).toHaveBeenCalledWith("notifications");
    expect(mock.update).toHaveBeenCalledWith({ is_read: true });
    expect(mock.eq).toHaveBeenCalledWith("id", "n1");
  });
});

describe("markAllNotificationsAsRead", () => {
  it("updates every unread notification for the given profile", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await markAllNotificationsAsRead("profile-1");

    expect(from).toHaveBeenCalledWith("notifications");
    expect(mock.update).toHaveBeenCalledWith({ is_read: true });
    expect(mock.eq).toHaveBeenCalledWith("profile_id", "profile-1");
    expect(mock.eq).toHaveBeenCalledWith("is_read", false);
  });
});

describe("getNotificationPreferences", () => {
  it("fetches preferences for the given profile", async () => {
    const row = { profile_id: "profile-1", in_app_enabled: true, email_enabled: false };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await getNotificationPreferences("profile-1");

    expect(from).toHaveBeenCalledWith("notification_preferences");
    expect(mock.eq).toHaveBeenCalledWith("profile_id", "profile-1");
    expect(mock.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(row);
  });

  it("returns null when no preferences row exists yet", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    const result = await getNotificationPreferences("profile-1");

    expect(result).toBeNull();
  });
});

describe("updateNotificationPreferences", () => {
  it("upserts the given profile's preferences", async () => {
    const row = { profile_id: "profile-1", in_app_enabled: true, email_enabled: false };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await updateNotificationPreferences("profile-1", { emailEnabled: false });

    expect(from).toHaveBeenCalledWith("notification_preferences");
    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: "profile-1", email_enabled: false }),
    );
    expect(result).toEqual(row);
  });
});
