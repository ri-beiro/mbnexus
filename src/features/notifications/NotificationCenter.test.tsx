import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/types/database";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" } }),
}));

vi.mock("@/features/notifications/useNotificationsBadge", () => ({
  useNotificationsBadge: () => 2,
}));

vi.mock("@/repositories/notificationRepository", () => ({
  listNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/repositories/notificationRepository";

const mockListNotifications = vi.mocked(listNotifications);
const mockMarkAsRead = vi.mocked(markNotificationAsRead);
const mockMarkAllAsRead = vi.mocked(markAllNotificationsAsRead);

function makeNotification(overrides: Partial<Notification> & { id: string; title: string }): Notification {
  return {
    organization_id: "org-1",
    profile_id: "user-1",
    type: "task.overdue",
    body: null,
    link_url: null,
    is_read: false,
    created_at: "2026-09-16T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockListNotifications.mockReset();
  mockMarkAsRead.mockReset();
  mockMarkAllAsRead.mockReset();
});

describe("NotificationCenter", () => {
  it("shows the unread badge count on the bell trigger", () => {
    mockListNotifications.mockResolvedValue([]);
    render(<NotificationCenter />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("loads and lists notifications when opened", async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue([
      makeNotification({ id: "n1", title: "Tarefa atribuída a você" }),
      makeNotification({ id: "n2", title: "Prazo se aproximando", is_read: true }),
    ]);

    render(<NotificationCenter />);
    await user.click(screen.getByRole("button", { name: /notificações/i }));

    expect(await screen.findByText("Tarefa atribuída a você")).toBeInTheDocument();
    expect(screen.getByText("Prazo se aproximando")).toBeInTheDocument();
  });

  it("shows an empty state when there are no notifications", async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue([]);

    render(<NotificationCenter />);
    await user.click(screen.getByRole("button", { name: /notificações/i }));

    expect(await screen.findByText(/nenhuma notificação/i)).toBeInTheDocument();
  });

  it("marks a notification as read and navigates when clicked", async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue([
      makeNotification({ id: "n1", title: "Tarefa atribuída a você", link_url: "/tasks/1" }),
    ]);
    mockMarkAsRead.mockResolvedValue(undefined);

    render(<NotificationCenter />);
    await user.click(screen.getByRole("button", { name: /notificações/i }));
    await user.click(await screen.findByText("Tarefa atribuída a você"));

    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith("n1"));
    expect(mockNavigate).toHaveBeenCalledWith("/tasks/1");
  });

  it("marks all notifications as read", async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue([makeNotification({ id: "n1", title: "Tarefa atribuída a você" })]);
    mockMarkAllAsRead.mockResolvedValue(undefined);

    render(<NotificationCenter />);
    await user.click(screen.getByRole("button", { name: /notificações/i }));
    await screen.findByText("Tarefa atribuída a você");

    await user.click(screen.getByRole("button", { name: /marcar todas como lidas/i }));

    await waitFor(() => expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-1"));
  });

  it("distinguishes unread notifications visually", async () => {
    const user = userEvent.setup();
    mockListNotifications.mockResolvedValue([
      makeNotification({ id: "n1", title: "Não lida" }),
      makeNotification({ id: "n2", title: "Já lida", is_read: true }),
    ]);

    render(<NotificationCenter />);
    await user.click(screen.getByRole("button", { name: /notificações/i }));
    await screen.findByText("Não lida");

    const unreadItem = screen.getByTestId("notification-item-n1");
    const readItem = screen.getByTestId("notification-item-n2");
    expect(within(unreadItem).getByTestId("unread-dot")).toBeInTheDocument();
    expect(within(readItem).queryByTestId("unread-dot")).not.toBeInTheDocument();
  });
});
