import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 * the underlying data is what matters and the legend surfaces it as text). */
export function ChartWidget({ title, testId, data }: ChartWidgetProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {data.map((d) => (
            <li key={d.label}>
              {d.label}: {d.value}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
