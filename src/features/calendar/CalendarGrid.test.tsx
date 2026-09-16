import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarGrid } from "@/features/calendar/CalendarGrid";
import type { CalendarItem } from "@/features/calendar/calendarLogic";

describe("CalendarGrid", () => {
  it("renders 42 day cells for the given month", () => {
    render(<CalendarGrid year={2026} month={8} items={[]} onItemDateChange={vi.fn()} />);
    expect(screen.getAllByTestId(/^calendar-day-/)).toHaveLength(42);
  });

  it("places each item under its own day cell", () => {
    const items: CalendarItem[] = [
      { id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" },
      { id: "2", date: "2026-09-21", title: "Reunião de time", kind: "reuniao" },
    ];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={vi.fn()} />);

    const day20 = screen.getByTestId("calendar-day-2026-09-20");
    const day21 = screen.getByTestId("calendar-day-2026-09-21");
    expect(within(day20).getByText("Entregar relatório")).toBeInTheDocument();
    expect(within(day21).getByText("Reunião de time")).toBeInTheDocument();
  });

  it("shows a distinct kind label for tasks, events, meetings and deadlines", () => {
    const items: CalendarItem[] = [
      { id: "1", date: "2026-09-20", title: "T", kind: "tarefa" },
      { id: "2", date: "2026-09-20", title: "E", kind: "evento" },
      { id: "3", date: "2026-09-20", title: "R", kind: "reuniao" },
      { id: "4", date: "2026-09-20", title: "P", kind: "prazo" },
    ];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={vi.fn()} />);

    const day = screen.getByTestId("calendar-day-2026-09-20");
    expect(within(day).getByText("Tarefa")).toBeInTheDocument();
    expect(within(day).getByText("Evento")).toBeInTheDocument();
    expect(within(day).getByText("Reunião")).toBeInTheDocument();
    expect(within(day).getByText("Prazo")).toBeInTheDocument();
  });

  it("calls onItemDateChange when an item's accessible date field changes", () => {
    const onItemDateChange = vi.fn();
    const items: CalendarItem[] = [{ id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" }];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={onItemDateChange} />);

    const input = screen.getByLabelText(/alterar data de entregar relatório/i);
    fireEvent.change(input, { target: { value: "2026-09-25" } });

    expect(onItemDateChange).toHaveBeenCalledWith("1", "2026-09-25");
  });
});
