import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Percent, FileText, Search, GitCompare } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { listReports } from "@/lib/report-store";
import type { AnalysisResult, StoredReport } from "@/lib/api";

export default function Dashboard() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    listReports().then(setReports).catch(() => setReports([]));
  }, []);

  const singles = reports.filter((r) => r.type === "single");
  const batches = reports.filter((r) => r.type === "batch");

  const avgSim =
    singles.length > 0
      ? Math.round(
          singles.reduce((a, r) => a + ((r.payload as AnalysisResult).similarity_score ?? 0), 0) /
            singles.length
        )
      : 0;

  const avgQly =
    singles.length > 0
      ? Math.round(
          singles.reduce((a, r) => a + ((r.payload as AnalysisResult).quality_score ?? 0), 0) /
            singles.length
        )
      : 0;

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your workspace</h1>
        <p className="text-muted-foreground text-sm">
          Reports are stored in your browser only — private to this device.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <FileText className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{singles.length}</p>
            <p className="text-xs text-muted-foreground">Single reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Layers className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{batches.length}</p>
            <p className="text-xs text-muted-foreground">Batch comparisons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Percent className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{mounted ? avgSim : "—"}%</p>
            <p className="text-xs text-muted-foreground">Avg similarity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Search className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{mounted ? avgQly : "—"}%</p>
            <p className="text-xs text-muted-foreground">Avg quality</p>
          </CardContent>
        </Card>
      </div>

      {mounted && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No reports yet. Run an analysis to get started.</p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/analyze">Analyze sample</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/compare">
                <GitCompare className="h-4 w-4 mr-2" />
                Compare batch
              </Link>
            </Button>
          </div>
        </div>
      )}

      {mounted && reports.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Recent reports
          </h2>
          {reports.slice(0, 20).map((r) => (
            <Card key={r.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {r.type === "batch" ? (
                    <GitCompare className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.label || (r.payload as AnalysisResult).report_meta?.lot_id || r.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.type === "batch" ? "Batch" : "Single"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/results/${r.id}`}>View</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
