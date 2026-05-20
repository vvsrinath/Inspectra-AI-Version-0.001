import { LabReportTable } from "@/components/LabReportTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  apiFetch,
  downloadComparisonPdf,
  downloadCsv,
  downloadPdf,
  type AnalysisResult,
  type BatchComparisonResult,
} from "@/lib/api";
import { getReport } from "@/lib/report-store";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Download,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GitCompare,
} from "lucide-react";
import { Link, useParams } from "wouter";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AnalysisResult | BatchComparisonResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const id = params.id;
      if (id && id !== "latest") {
        const stored = await getReport(id);
        if (stored) {
          setData(stored.payload);
          return;
        }
      }
      const raw = sessionStorage.getItem("inspectra_analysis");
      if (raw) {
        try {
          setData(JSON.parse(raw));
        } catch {
          sessionStorage.removeItem("inspectra_analysis");
        }
      }
    };
    load();
  }, [params.id]);

  const handleDownloadPDF = async () => {
    if (!data) return;
    setDownloading(true);
    setActionError(null);
    try {
      const isBatchReport = "statistics" in data && data.sample_count > 1;
      if (isBatchReport) {
        await downloadComparisonPdf(data as BatchComparisonResult);
      } else {
        await downloadPdf(data);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!data) return;
    setDownloading(true);
    setActionError(null);
    try {
      await downloadCsv(data);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not export CSV");
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveToDrive = async () => {
    setSaving(true);
    setActionError(null);
    try {
      const res = await apiFetch("/save-to-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      const result = (await res.json()) as { message?: string };
      alert(result.message ?? "Saved to Google Drive.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col min-h-full items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Loading report...</p>
        <Button asChild>
          <Link href="/analyze">Run a new analysis</Link>
        </Button>
      </div>
    );
  }

  const analysisId = data.analysis_id ?? "INS-UNKNOWN";
  const isBatch = "statistics" in data && data.sample_count > 1;

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold mb-3">
            <CheckCircle2 className="w-4 h-4" />
            Analysis Complete · {data.processing_ms} ms
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {isBatch ? "Comparison Lab Report" : "Lab Report"}
          </h1>
          {!isBatch && (
            <p className="text-xs text-muted-foreground mb-1">Classical CV — no AI models</p>
          )}
          {isBatch && (
            <p className="text-xs text-muted-foreground mb-1">
              Multi-sample comparison · Classical CV — no AI models
            </p>
          )}
          <p className="text-muted-foreground">
            ID: {analysisId}
            {data.report_meta?.lot_id ? ` · Lot ${data.report_meta.lot_id}` : ""}
            {data.timestamp ? ` · ${data.timestamp}` : ""}
          </p>
          <p className="text-sm mt-1">
            Verdict: <strong>{data.verdict}</strong> · Grade: <strong>{data.grade ?? data.values?.GRD}</strong>
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPDF} disabled={downloading}>
              <Download className="w-4 h-4" />
              {isBatch ? "Comparison PDF" : "PDF"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleDownloadCSV} disabled={downloading}>
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleSaveToDrive} disabled={saving}>
              <HardDrive className="w-4 h-4" />
              {saving ? "Saving..." : "Drive"}
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <Link href="/compare">
                <GitCompare className="w-4 h-4" />
                Compare batch
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-sm font-normal uppercase tracking-wide">
            Inspectra AI — Textile Testing &amp; Analysis Centre
          </CardTitle>
          <p className="text-center text-xs text-muted-foreground">
            Lot: {data.report_meta?.lot_id} {data.report_meta?.mill_name} · Operator:{" "}
            {data.report_meta?.operator}
          </p>
        </CardHeader>
        <CardContent>
          <LabReportTable rows={data.rows} columns={data.columns} />
          <p className="text-sm font-semibold mt-4">
            Total Number of Samples - {data.sample_count}
          </p>
        </CardContent>
      </Card>

      {!isBatch && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 border-none shadow-md bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <span className="text-4xl font-extrabold">{data.similarity_score}%</span>
              <span className="text-xs text-muted-foreground uppercase mt-1">Similarity (SIM)</span>
              <h3 className="text-lg font-semibold mt-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                {data.quality_status} · Grade {data.grade}
              </h3>
            </CardContent>
          </Card>
          <Card className="col-span-1 md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Findings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{data.texture_analysis}</p>
              <p>{data.pattern_analysis}</p>
              <p className="text-muted-foreground">{data.recommendation}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-blue-500" />
            Analysis &amp; explanation
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            {(data.explanation ?? data.findings ?? []).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
