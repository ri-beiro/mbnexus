import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarGrid } from "@/features/calendar/CalendarGrid";
import type { CalendarItem } from "@/features/calendar/calendarLogic";

describe("CalendarGrid", () => {
  it("renders 42 day cells for the given month", () => {
    render(<CalendarGrid year={2026} month={8} items={[]} onItemDateChange={vi.fn()} onItemClick={vi.fn()} />);
    expect(screen.getAllByTestId(/^calendar-day-/)).toHaveLength(42);
  });

  it("shows a colored dot per kind present in a day, with a count when there is more than one", () => {
    const items: CalendarItem[] = [
      { id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" },
      { id: "2", date: "2026-09-20", title: "Corrigir bug", kind: "tarefa" },
      { id: "3", date: "2026-09-20", title: "Workshop", kind: "evento" },
    ];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={vi.fn()} onItemClick={vi.fn()} />);

    const day20 = screen.getByTestId("calendar-day-2026-09-20");
    expect(within(day20).getByRole("button", { name: /2 tarefas/i })).toBeInTheDocument();
    expect(within(day20).getByRole("button", { name: /1 evento/i })).toBeInTheDocument();
  });

  it("does not show any item titles directly on the day cell", () => {
    const items: CalendarItem[] = [{ id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" }];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={vi.fn()} onItemClick={vi.fn()} />);

    const day20 = screen.getByTestId("calendar-day-2026-09-20");
    expect(within(day20).queryByText("Entregar relatório")).not.toBeInTheDocument();
  });

  it("opens a details menu listing every item for the day when its dot is clicked", async () => {
    const user = userEvent.setup();
    const items: CalendarItem[] = [
      { id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" },
      { id: "2", date: "2026-09-20", title: "Reunião de time", kind: "reuniao" },
    ];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={vi.fn()} onItemClick={vi.fn()} />);

    const day20 = screen.getByTestId("calendar-day-2026-09-20");
    await user.click(within(day20).getByRole("button", { name: /1 tarefa/i }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Entregar relatório")).toBeInTheDocument();
    expect(within(menu).getByText("Reunião de time")).toBeInTheDocument();
  });

  it("calls onItemClick with the item when an entry in the details menu is selected", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const items: CalendarItem[] = [{ id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" }];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={vi.fn()} onItemClick={onItemClick} />);

    const day20 = screen.getByTestId("calendar-day-2026-09-20");
    await user.click(within(day20).getByRole("button", { name: /1 tarefa/i }));
    await user.click(await screen.findByText("Entregar relatório"));

    expect(onItemClick).toHaveBeenCalledWith(items[0]);
  });

  it("shows no dot cluster on a day with no items", () => {
    render(<CalendarGrid year={2026} month={8} items={[]} onItemDateChange={vi.fn()} onItemClick={vi.fn()} />);
    const day20 = screen.getByTestId("calendar-day-2026-09-20");
    expect(within(day20).queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onItemDateChange when an item's accessible date field changes", () => {
    const onItemDateChange = vi.fn();
    const items: CalendarItem[] = [{ id: "1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" }];
    render(<CalendarGrid year={2026} month={8} items={items} onItemDateChange={onItemDateChange} onItemClick={vi.fn()} />);

    const input = screen.getByLabelText(/alterar data de entregar relatório/i);
    fireEvent.change(input, { target: { value: "2026-09-25" } });

    expect(onItemDateChange).toHaveBeenCalledWith("1", "2026-09-25");
  });
});
