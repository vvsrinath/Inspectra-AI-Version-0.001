"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Percent, FileText, Search, GitCompare } from "lucide-react";
import Link from "next/link";
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Dashboard</h1>
            <p className="text-muted-foreground">
              Private workspace — only your reports appear here.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href="/analyze">
                <Search className="mr-2 h-4 w-4" />
                New Analysis
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl">
              <Link href="/compare">
                <GitCompare className="mr-2 h-4 w-4" />
                Compare
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Analyses
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mounted ? reports.length : "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {singles.length} single · {batches.length} batch
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Similarity
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mounted && singles.length ? `${avgSim}%` : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mounted ? reports.length : "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Stored in your browser</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Quality
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {mounted && singles.length ? `${avgQly}/100` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Your recent reports</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
            ) : reports.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reports yet.{" "}
                <Link href="/analyze" className="text-primary underline">
                  Run your first analysis
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 10).map((r) => {
                  const p = r.payload;
                  return (
                    <Link
                      key={r.id}
                      href={`/results/${r.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {r.label ?? p.report_meta?.lot_id ?? r.id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.type === "batch" ? "Batch" : "Single"} · {p.verdict} · Grade{" "}
                            {p.grade ?? p.values?.GRD}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {typeof p.similarity_score === "number"
                          ? `${p.similarity_score}%`
                          : p.verdict}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
