import type { ReportRow } from "@/lib/api";
import { METRIC_COLUMNS } from "@/lib/api";

type Props = {
  rows: ReportRow[];
  columns?: string[];
  compact?: boolean;
};

export function LabReportTable({ rows, columns = [...METRIC_COLUMNS], compact }: Props) {
  const statRows = new Set(["MEAN", "STD DEV", "C.V.%"]);

  return (
    <div className="table-scroll-mobile rounded-lg border bg-background">
      <p className="md:hidden text-xs text-muted-foreground px-2 py-1.5 border-b bg-muted/30">
        Swipe horizontally to view all metrics
      </p>
      <table className={`w-full text-left ${compact ? "text-xs" : "text-sm"}`}>
        <thead>
          <tr className="border-b bg-muted/80">
            <th className="px-2 py-2 font-semibold whitespace-nowrap">Test ID</th>
            {columns.map((c) => (
              <th key={c} className="px-2 py-2 font-semibold whitespace-nowrap text-center">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.test_id}
              className={`border-b last:border-0 ${
                statRows.has(row.test_id) ? "bg-muted/40 font-semibold" : ""
              }`}
            >
              <td className="px-2 py-1.5 whitespace-nowrap">{row.test_id}</td>
              {columns.map((c) => (
                <td key={c} className="px-2 py-1.5 text-center tabular-nums">
                  {row.values[c] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
