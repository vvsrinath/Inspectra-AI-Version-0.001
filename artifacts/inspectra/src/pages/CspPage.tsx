import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveApiBase } from "@/lib/api-base";
import { apiHeaders } from "@/lib/workspace";
import {
  UploadCloud,
  FileImage,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FlaskConical,
  Wheat,
  BarChart3,
  BookOpen,
  Download,
  FileText,
  HardDrive,
  FileSpreadsheet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

interface BciStatus {
  checks: Record<string, boolean>;
  passed: number;
  total: number;
  status: string;
}

interface CottonType {
  key: string;
  name: string;
  examples: string;
  description: string;
}

interface Benchmark {
  ne_range: string;
  csp_excellent: number;
  csp_good: number;
  csp_average: number;
  csp_below: number;
  uster_percentile: string;
}

interface CspResult {
  analysis_id: string;
  timestamp: string;
  csp: number;
  estimated_ne: number;
  strength_factor: number;
  uniformity_index: number;
  fiber_fineness_index: number;
  nep_index: number;
  short_fiber_index: number;
  weave_type: string;
  cotton_type: CottonType;
  grade: string;
  grade_label: string;
  benchmark: Benchmark;
  bci_status: BciStatus;
  findings: string[];
  processing_ms: number;
  standard_refs: string[];
  report_meta: { lot_id: string; mill_name: string; operator: string; serial_no: string };
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-600 dark:text-green-400",
  B: "text-blue-600 dark:text-blue-400",
  C: "text-amber-600 dark:text-amber-400",
  D: "text-destructive",
};

const GRADE_BG: Record<string, string> = {
  A: "bg-green-500/10 border-green-500/30",
  B: "bg-blue-500/10 border-blue-500/30",
  C: "bg-amber-500/10 border-amber-500/30",
  D: "bg-destructive/10 border-destructive/30",
};

function BenchmarkBar({
  value, min, max, label,
}: { value: number; min: number; max: number; label: string }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

async function downloadCspPdf(result: CspResult) {
  const base = resolveApiBase();
  const res = await fetch(`${base}/csp-report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify(result),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `PDF failed (${res.status})`);
  }
  const { pdf_base64 } = (await res.json()) as { pdf_base64: string };
  const lot = result.report_meta?.lot_id?.replace(/[^a-zA-Z0-9-]/g, "_") ?? "csp";
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${pdf_base64}`;
  link.download = `Inspectra-CSP-${lot}-${result.analysis_id}.pdf`;
  link.click();
}

async function downloadCspCsv(result: CspResult) {
  const base = resolveApiBase();
  const res = await fetch(`${base}/csp-report/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify(result),
  });
  if (!res.ok) throw new Error(`CSV failed (${res.status})`);
  const text = await res.text();
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Inspectra-CSP-${result.analysis_id}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveToDrive(result: CspResult): Promise<string> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/save-to-drive`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify({ ...result, report_type: "csp" }),
  });
  if (!res.ok) throw new Error(`Drive save failed (${res.status})`);
  const data = await res.json() as { message?: string };
  return data.message ?? "Saved to Google Drive";
}

export default function CspPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CspResult | null>(null);
  const [lotId, setLotId] = useState("");
  const [millName, setMillName] = useState("");
  const [operator, setOperator] = useState("MMN");

  const [dlPdf, setDlPdf] = useState(false);
  const [dlCsv, setDlCsv] = useState(false);
  const [dlDrive, setDlDrive] = useState(false);
  const [driveMsg, setDriveMsg] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setPreview(URL.createObjectURL(acceptedFiles[0]));
      setError(null);
      setResult(null);
      setDriveMsg(null);
      setDlError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
  });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDriveMsg(null);
    setDlError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (lotId) formData.append("lot_id", lotId);
      if (millName) formData.append("mill_name", millName);
      formData.append("operator", operator);

      const base = resolveApiBase();
      const res = await fetch(`${base}/csp-report`, {
        method: "POST",
        body: formData,
        headers: apiHeaders() as HeadersInit,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Failed (${res.status})`);
      }
      setResult(await res.json() as CspResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDlPdf(true); setDlError(null);
    try { await downloadCspPdf(result); }
    catch (e) { setDlError(e instanceof Error ? e.message : "PDF download failed"); }
    finally { setDlPdf(false); }
  };

  const handleDownloadCsv = async () => {
    if (!result) return;
    setDlCsv(true); setDlError(null);
    try { await downloadCspCsv(result); }
    catch (e) { setDlError(e instanceof Error ? e.message : "CSV download failed"); }
    finally { setDlCsv(false); }
  };

  const handleSaveDrive = async () => {
    if (!result) return;
    setDlDrive(true); setDlError(null); setDriveMsg(null);
    try { setDriveMsg(await saveToDrive(result)); }
    catch (e) { setDlError(e instanceof Error ? e.message : "Drive save failed"); }
    finally { setDlDrive(false); }
  };

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <FlaskConical className="h-3 w-3" />
          Classical CV only — no AI / ML models
        </div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Wheat className="h-8 w-8 text-amber-600" />
          Cotton CSP Reporter
        </h1>
        <p className="text-muted-foreground">
          Count Strength Product analysis from fabric image — benchmarked against USTER® Statistics,
          ISO&nbsp;2061, ASTM&nbsp;D1907 and BCI quality thresholds.
        </p>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6 grid md:grid-cols-3 gap-4">
          <label className="text-sm">
            Lot ID
            <input className="mt-1 w-full rounded-md border px-3 py-2 bg-background" value={lotId} onChange={e => setLotId(e.target.value)} placeholder="e.g. C:05465" />
          </label>
          <label className="text-sm">
            Mill name
            <input className="mt-1 w-full rounded-md border px-3 py-2 bg-background" value={millName} onChange={e => setMillName(e.target.value)} />
          </label>
          <label className="text-sm">
            Operator
            <input className="mt-1 w-full rounded-md border px-3 py-2 bg-background" value={operator} onChange={e => setOperator(e.target.value)} />
          </label>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card className="border-dashed border-2">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`p-6 sm:p-10 flex flex-col items-center cursor-pointer ${isDragActive ? "bg-primary/5" : "hover:bg-secondary/30"}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-10 w-10 text-amber-600 mb-3" />
            <p className="font-medium">{isDragActive ? "Drop image here" : "Drop cotton fabric image or click to upload"}</p>
            <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, WebP</p>
          </div>
          {preview && (
            <div className="px-4 pb-4">
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain mx-auto border" />
              <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <FileImage className="h-3 w-3" />{file?.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</div>
      )}

      <Button size="lg" className="w-full sm:w-auto min-h-12" onClick={handleAnalyze} disabled={!file || loading}>
        {loading
          ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Analyzing cotton…</>
          : <><FlaskConical className="mr-2 h-4 w-4" />Run CSP Analysis</>}
      </Button>

      {/* ── Results ─────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6">
          {/* CSP Score hero */}
          <Card className={`border-2 ${GRADE_BG[result.grade]}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="text-center md:border-r md:pr-6">
                  <div className={`text-7xl font-black ${GRADE_COLORS[result.grade]}`}>{result.csp}</div>
                  <div className="text-sm text-muted-foreground mt-1">CSP Score</div>
                  <div className={`text-xl font-bold mt-1 ${GRADE_COLORS[result.grade]}`}>
                    Grade {result.grade} — {result.grade_label}
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Estimated Ne</span>
                    <div className="font-bold text-lg font-mono">{result.estimated_ne}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strength factor</span>
                    <div className="font-bold text-lg font-mono">{result.strength_factor}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weave type</span>
                    <div className="font-medium">{result.weave_type}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">USTER® percentile</span>
                    <div className="font-medium">{result.benchmark.uster_percentile}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Cotton type</span>
                    <div className="font-medium">{result.cotton_type.name}</div>
                    <div className="text-xs text-muted-foreground">{result.cotton_type.examples}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Download bar ──────────────────────────────────────────── */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium mr-2">
                  <Download className="h-4 w-4" />
                  Download report
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={dlPdf}
                    className="gap-2"
                  >
                    {dlPdf
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileText className="h-4 w-4 text-red-500" />}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCsv}
                    disabled={dlCsv}
                    className="gap-2"
                  >
                    {dlCsv
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                    Download CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDrive}
                    disabled={dlDrive}
                    className="gap-2"
                  >
                    {dlDrive
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <HardDrive className="h-4 w-4 text-blue-500" />}
                    Save to Drive
                  </Button>
                </div>
              </div>
              {driveMsg && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />{driveMsg}
                </p>
              )}
              {dlError && (
                <p className="mt-2 text-sm text-destructive">{dlError}</p>
              )}
            </CardContent>
          </Card>

          {/* Metrics + Benchmark */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Fibre metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BenchmarkBar value={result.uniformity_index} min={50} max={100} label="Uniformity index (%)" />
                <BenchmarkBar value={result.fiber_fineness_index} min={2.5} max={7} label="Fineness index (micronaire proxy)" />
                <BenchmarkBar value={Math.min(result.nep_index, 600)} min={0} max={600} label="Nep index (per g equivalent)" />
                <BenchmarkBar value={result.short_fiber_index} min={0} max={40} label="Short fibre index (%)" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  USTER® CSP benchmarks — {result.benchmark.ne_range}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Excellent (top 25%)", value: result.benchmark.csp_excellent, color: "bg-green-500" },
                    { label: "Good (25–50%)", value: result.benchmark.csp_good, color: "bg-blue-500" },
                    { label: "Average (50–75%)", value: result.benchmark.csp_average, color: "bg-amber-500" },
                    { label: "Below average", value: result.benchmark.csp_below, color: "bg-destructive" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${row.color}`} />
                      <span className="flex-1 text-muted-foreground">{row.label}</span>
                      <span className="font-mono font-semibold">{row.value}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between font-semibold">
                      <span>Your CSP</span>
                      <span className={`font-mono ${GRADE_COLORS[result.grade]}`}>{result.csp}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>USTER® percentile</span>
                      <span>{result.benchmark.uster_percentile}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BCI Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Better Cotton Initiative (BCI) quality checks
                <span className={`ml-auto text-sm font-normal px-2 py-0.5 rounded-full ${
                  result.bci_status.passed === result.bci_status.total
                    ? "bg-green-500/10 text-green-600"
                    : result.bci_status.passed >= 3
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {result.bci_status.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {Object.entries(result.bci_status.checks).map(([label, passed]) => (
                  <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${passed ? "bg-green-500/5 border border-green-500/20" : "bg-destructive/5 border border-destructive/20"}`}>
                    {passed
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Findings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Analysis findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0 font-mono text-xs mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Standards reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Industry standards referenced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {result.standard_refs.map((ref, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0">•</span>{ref}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
                Method: INS-CSP-001 | Classical CV — OpenCV + scikit-image | <strong>No AI/ML models used</strong>
                {" · "}Analysis ID: {result.analysis_id}
                {" · "}{result.timestamp}
                {" · "}Processed in {result.processing_ms} ms
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
