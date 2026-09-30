import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDatum } from "@/features/dashboards/dashboardLogic";

interface ChartWidgetProps {
  title: string;
  testId: string;
  data: ChartDatum[];
}

/** A bar chart plus a plain-text legend of the same numbers — the legend is
 * both an accessible alternative to the SVG chart and, not incidentally,
 * what the automated tests read (jsdom can't lay out Recharts's SVG, so
 * its rendered pixels aren't something a test can meaningfully assert on;
 * the underlying data is what matters and the legend surfaces it as text).
 * Renders as a sunken panel (no shadow of its own) so it nests cleanly
 * inside the raised "Visão geral" card on the Home page. */
export function ChartWidget({ title, testId, data }: ChartWidgetProps) {
  return (
    <div data-testid={testId} className="neu-sunken space-y-3 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">{title}</h3>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--neu-divider)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "var(--neu-panel-from)",
                border: "none",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill="var(--neu-lime-solid)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {data.map((d) => (
          <li key={d.label} className="font-mono">
            {d.label}: {d.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
