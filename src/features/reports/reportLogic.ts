import type { Task } from "@/types/database";

export interface PersonReportRow {
  profileId: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRatePercent: number;
  onTimeRatePercent: number | null;
}

/** Productivity report for one person (section 38: produtividade, tarefas
 * concluídas, tarefas atrasadas, cumprimento de prazo). The schema has no
 * dedicated "completed at" timestamp, so on-time completion is approximated
 * by comparing a concluido task's due_date against the date its status was
 * last changed (updated_at) — a reasonable proxy, not exact for tasks whose
 * other fields were edited after completion. */
export function computePersonReport(profileId: string, tasks: Task[], referenceDate: string): PersonReportRow {
  const completed = tasks.filter((t) => t.status === "concluido");
  const overdue = tasks.filter((t) => t.status !== "concluido" && t.due_date !== null && t.due_date < referenceDate);
  const completedWithDueDate = completed.filter((t) => t.due_date !== null);
  const onTime = completedWithDueDate.filter((t) => t.updated_at.slice(0, 10) <= t.due_date!);

  return {
    profileId,
    totalTasks: tasks.length,
    completedTasks: completed.length,
    overdueTasks: overdue.length,
    completionRatePercent: tasks.length === 0 ? 0 : Math.round((completed.length / tasks.length) * 100),
    onTimeRatePercent:
      completedWithDueDate.length === 0 ? null : Math.round((onTime.length / completedWithDueDate.length) * 100),
  };
}

export interface CsvColumn {
  key: string;
  label: string;
}

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes rows to CSV (section 38: exportação Excel/CSV), CRLF-joined
 * per RFC 4180, values quoted only when they need it. */
export function toCsv(rows: Array<Record<string, string | number>>, columns: CsvColumn[]): string {
  const lines = [
    columns.map((c) => escapeCsvValue(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escapeCsvValue(String(row[c.key]))).join(",")),
  ];
  return lines.join("\r\n");
}
