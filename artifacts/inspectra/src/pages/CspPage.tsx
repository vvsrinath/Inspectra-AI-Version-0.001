import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveApiBase } from "@/lib/api-base";
import { apiHeaders } from "@/lib/workspace";
import {
  UploadCloud, FileImage, Loader2, CheckCircle2, XCircle,
  AlertTriangle, FlaskConical, Wheat, BarChart3, BookOpen,
  Download, FileText, HardDrive, FileSpreadsheet, Info,
  Microscope, Layers, Zap, Target, TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

/* ─── Types ─────────────────────────────────────────── */
interface BciStatus {
  checks: Record<string, boolean>;
  passed: number; total: number; status: string;
}
interface CountryOrigin {
  country: string; region: string; varieties: string;
}
interface CottonType {
  key: string; name: string; examples: string; varieties?: string;
  staple_length: string; uhml_range?: string; micronaire: string;
  strength_gptex: string; typical_uses: string;
  end_count_range: string; description: string;
  price_premium?: string; market_share?: string;
  countries_of_origin?: CountryOrigin[];
}
interface Benchmark {
  ne_range: string; csp_excellent: number; csp_good: number;
  csp_average: number; csp_below: number; csp_minimum: number;
  uster_percentile: string; spinning_system: string;
}
interface ItmfCv {
  cv_percent: number; limit_excellent: number; limit_good: number;
  limit_acceptable: number; status: string;
}
interface StapleGrade {
  name: string; examples: string;
  uhml_min: number; uhml_max: number; uhml_inches: number;
}
interface CspResult {
  analysis_id: string; timestamp: string;
  csp: number; estimated_ne: number; strength_factor: number;
  grade: string; grade_label: string; quality_score: number;
  uniformity_index: number; ui_grade: string; ui_grade_letter: string;
  micronaire: number; fiber_fineness_index: number;
  nep_index: number; short_fiber_index: number;
  hairiness_index: number; elongation_index: number;
  /* HVI Staple Length */
  uhml_inches: number; uhml_mm: number;
  mean_length_inches: number; mean_length_mm: number;
  sfc_n: number; sfc_w: number;
  staple_grade: StapleGrade;
  /* HVI Color */
  rd: number; plus_b: number; color_grade: string; color_grade_code: string;
  trash_percent: number;
  /* HVI Spinnability */
  sci: number; ipi: number; maturity_ratio: number;
  /* Fabric */
  warp_tpi: number; weft_tpi: number; cover_factor: number;
  twist_angle: number; fiber_orientation_deg: number;
  weave_type: string; spinning_system: string;
  cotton_type: CottonType; benchmark: Benchmark;
  bci_status: BciStatus; itmf_cv: ItmfCv;
  findings: string[]; recommendations: string[];
  processing_ms: number; standard_refs: string[];
  report_meta: { lot_id: string; mill_name: string; operator: string; serial_no: string };
}

/* ─── Grade styles ───────────────────────────────────── */
const GRADE_COLOR: Record<string, string> = {
  A: "text-green-600 dark:text-green-400",
  B: "text-blue-600 dark:text-blue-400",
  C: "text-amber-500 dark:text-amber-400",
  D: "text-red-600 dark:text-red-400",
};
const GRADE_BG: Record<string, string> = {
  A: "bg-green-500/10 border-green-500/30",
  B: "bg-blue-500/10 border-blue-500/30",
  C: "bg-amber-500/10 border-amber-500/30",
  D: "bg-red-500/10 border-red-500/30",
};
const GRADE_RING: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#ef4444",
};

/* ─── Radial gauge ───────────────────────────────────── */
function CspGauge({ csp, grade, label }: { csp: number; grade: string; label: string }) {
  const max = 4500;
  const pct = Math.min(csp / max, 1);
  const r = 54; const circ = 2 * Math.PI * r;
  const dash = pct * circ * 0.75;
  return (
    <svg viewBox="0 0 140 100" className="w-48 h-32 mx-auto">
      <circle cx="70" cy="80" r={r} fill="none" strokeWidth="10" stroke="currentColor"
        className="text-secondary" strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" transform="rotate(135 70 80)" />
      <circle cx="70" cy="80" r={r} fill="none" strokeWidth="10"
        stroke={GRADE_RING[grade] ?? "#6b7280"}
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" transform="rotate(135 70 80)" />
      <text x="70" y="72" textAnchor="middle" fontSize="22" fontWeight="700"
        fill={GRADE_RING[grade] ?? "#6b7280"}>{csp}</text>
      <text x="70" y="87" textAnchor="middle" fontSize="9" fill="#9ca3af">CSP Score</text>
      <text x="70" y="98" textAnchor="middle" fontSize="8" fill="#9ca3af">{label}</text>
    </svg>
  );
}

/* ─── Metric bar ─────────────────────────────────────── */
function MetricBar({
  label, value, unit = "", min, max, good_lo, good_hi, invert = false,
}: {
  label: string; value: number; unit?: string;
  min: number; max: number; good_lo?: number; good_hi?: number; invert?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const inRange = good_lo !== undefined && good_hi !== undefined
    ? value >= good_lo && value <= good_hi : null;
  const barColor = inRange === null ? "bg-primary"
    : invert
      ? (value <= (good_hi ?? max) ? "bg-green-500" : "bg-red-500")
      : (inRange ? "bg-green-500" : "bg-amber-500");
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {good_lo !== undefined && (
        <div className="flex justify-between text-[10px] text-muted-foreground/50">
          <span>{min}{unit}</span>
          <span className="text-muted-foreground/70">target {good_lo}–{good_hi}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Download helpers ───────────────────────────────── */
async function dlPdf(result: CspResult) {
  const base = resolveApiBase();
  const res = await fetch(`${base}/csp-report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify(result),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `PDF failed (${res.status})`);
  const { pdf_base64 } = await res.json() as { pdf_base64: string };
  const lot = result.report_meta?.lot_id?.replace(/[^a-zA-Z0-9-]/g, "_") ?? "csp";
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${pdf_base64}`;
  a.download = `Inspectra-CSP-${lot}-${result.analysis_id}.pdf`;
  a.click();
}
async function dlCsv(result: CspResult) {
  const base = resolveApiBase();
  const res = await fetch(`${base}/csp-report/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify(result),
  });
  if (!res.ok) throw new Error(`CSV failed (${res.status})`);
  const blob = new Blob([await res.text()], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Inspectra-CSP-${result.analysis_id}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
async function dlDrive(result: CspResult): Promise<string> {
  const base = resolveApiBase();
  const res = await fetch(`${base}/save-to-drive`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify({ ...result, report_type: "csp" }),
  });
  if (!res.ok) throw new Error(`Drive save failed (${res.status})`);
  return ((await res.json()) as { message?: string }).message ?? "Saved to Google Drive";
}

/* ─── Page ───────────────────────────────────────────── */
export default function CspPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CspResult | null>(null);
  const [lotId, setLotId] = useState("");
  const [millName, setMillName] = useState("");
  const [operator, setOperator] = useState("MMN");

  const [busyPdf, setBusyPdf] = useState(false);
  const [busyCsv, setBusyCsv] = useState(false);
  const [busyDrive, setBusyDrive] = useState(false);
  const [driveMsg, setDriveMsg] = useState<string | null>(null);
  const [dlErr, setDlErr] = useState<string | null>(null);

  const onDrop = useCallback((files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setPreview(URL.createObjectURL(files[0]));
    setError(null); setResult(null); setDriveMsg(null); setDlErr(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] }, maxFiles: 1,
  });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setDriveMsg(null); setDlErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (lotId) fd.append("lot_id", lotId);
      if (millName) fd.append("mill_name", millName);
      fd.append("operator", operator);
      const res = await fetch(`${resolveApiBase()}/csp-report`, {
        method: "POST", body: fd, headers: apiHeaders() as HeadersInit,
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).detail) ?? `Failed (${res.status})`);
      setResult(await res.json() as CspResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally { setLoading(false); }
  };

  const wrap = async (
    setter: (v: boolean) => void,
    fn: () => Promise<string | void>,
    msgSetter?: (v: string) => void
  ) => {
    setter(true); setDlErr(null);
    try { const m = await fn(); if (m && msgSetter) msgSetter(m); }
    catch (e) { setDlErr(e instanceof Error ? e.message : "Failed"); }
    finally { setter(false); }
  };

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-5">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium mb-3">
          <FlaskConical className="h-3 w-3" />
          Classical CV — no AI / ML models · USTER® 2023 benchmarks
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-1">
          <Wheat className="h-8 w-8 text-amber-600" />
          Cotton CSP Reporter
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a cotton fabric image to receive a full Count Strength Product report benchmarked against
          USTER® Statistics 2023, BCI quality thresholds, ISO 7211-2, ASTM D1907, and BIS IS:1117.
        </p>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-5 pb-5 grid md:grid-cols-3 gap-4">
          {[
            { label: "Lot ID", val: lotId, set: setLotId, ph: "e.g. C:05465" },
            { label: "Mill name", val: millName, set: setMillName, ph: "" },
            { label: "Operator", val: operator, set: setOperator, ph: "MMN" },
          ].map(f => (
            <label key={f.label} className="text-sm font-medium">
              {f.label}
              <input className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Upload */}
      <Card className="border-dashed border-2">
        <CardContent className="p-0">
          <div {...getRootProps()} className={`p-8 flex flex-col items-center cursor-pointer transition-colors ${isDragActive ? "bg-amber-500/5" : "hover:bg-secondary/30"}`}>
            <input {...getInputProps()} />
            <UploadCloud className="h-10 w-10 text-amber-500 mb-3" />
            <p className="font-medium">{isDragActive ? "Drop here" : "Drop cotton fabric image or click to browse"}</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG · PNG · WebP — max 20 MB</p>
          </div>
          {preview && (
            <div className="px-4 pb-4 flex flex-col items-center gap-2">
              <img src={preview} alt="preview" className="max-h-44 rounded-lg border object-contain" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileImage className="h-3 w-3" />{file?.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</p>}

      <Button size="lg" className="w-full sm:w-auto min-h-12 bg-amber-600 hover:bg-amber-700"
        onClick={handleAnalyze} disabled={!file || loading}>
        {loading
          ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Analyzing cotton fabric…</>
          : <><Microscope className="mr-2 h-4 w-4" />Run CSP Analysis</>}
      </Button>

      {/* ─── Results ─────────────────────────────────── */}
      {result && (
        <div className="space-y-5">

          {/* Hero score */}
          <Card className={`border-2 ${GRADE_BG[result.grade]}`}>
            <CardContent className="pt-6 pb-5">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex flex-col items-center">
                  <CspGauge csp={result.csp} grade={result.grade} label={result.grade_label} />
                  <div className={`text-2xl font-black mt-1 ${GRADE_COLOR[result.grade]}`}>
                    Grade {result.grade} — {result.grade_label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    USTER® {result.benchmark.uster_percentile}
                  </div>
                  {/* Quality score pill */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">Quality score</div>
                    <div className="w-28 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500"
                        style={{ width: `${result.quality_score}%` }} />
                    </div>
                    <span className="text-xs font-bold">{result.quality_score}/100</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm w-full">
                  {[
                    { label: "Estimated Ne", value: result.estimated_ne, unit: "" },
                    { label: "Strength factor", value: result.strength_factor, unit: " g/tex" },
                    { label: "Spinning system", value: result.spinning_system, unit: "" },
                    { label: "Weave type", value: result.weave_type, unit: "" },
                    { label: "Warp / Weft TPI", value: `${result.warp_tpi} / ${result.weft_tpi}`, unit: "" },
                    { label: "Cover factor", value: result.cover_factor, unit: "" },
                    { label: "Twist angle", value: `${result.twist_angle}°`, unit: "" },
                    { label: "Cotton type", value: result.cotton_type.name, unit: "" },
                    { label: "Ne range (type)", value: result.cotton_type.end_count_range, unit: "" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="text-muted-foreground text-xs">{row.label}</div>
                      <div className="font-semibold mt-0.5">{row.value}{row.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download bar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />Download report
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" disabled={busyPdf}
                    onClick={() => wrap(setBusyPdf, () => dlPdf(result))}>
                    {busyPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-500" />}
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={busyCsv}
                    onClick={() => wrap(setBusyCsv, () => dlCsv(result))}>
                    {busyCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={busyDrive}
                    onClick={() => wrap(setBusyDrive, () => dlDrive(result), setDriveMsg)}>
                    {busyDrive ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4 text-blue-500" />}
                    Save to Drive
                  </Button>
                </div>
              </div>
              {driveMsg && <p className="mt-2 text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />{driveMsg}</p>}
              {dlErr && <p className="mt-2 text-sm text-destructive">{dlErr}</p>}
            </CardContent>
          </Card>

          {/* ══ HVI Staple Length ══════════════════════════════════ */}
          <div className="grid md:grid-cols-3 gap-5">
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  HVI Staple Length (Cotton Fibre Length)
                  <span className="ml-auto text-xs font-normal text-muted-foreground">ASTM D5867 · Lord's formula</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "UHML (inches)", value: result.uhml_inches?.toFixed(3) ?? "—", note: "Upper Half Mean Length", highlight: true },
                    { label: "UHML (mm)",     value: `${result.uhml_mm ?? "—"} mm`,          note: "Staple length in mm" },
                    { label: "Mean Length",   value: `${result.mean_length_inches?.toFixed(3) ?? "—"}″`, note: "ML (7.8% fibrogram point)" },
                    { label: "SFC_n (%)",     value: `${result.sfc_n?.toFixed(1) ?? "—"}%`,  note: "Short fibre by number (<12.7 mm)" },
                    { label: "SFC_w (%)",     value: `${result.sfc_w?.toFixed(1) ?? "—"}%`,  note: "Short fibre by weight" },
                    { label: "UI (%)",        value: `${result.uniformity_index?.toFixed(1) ?? "—"}%`,  note: `${result.ui_grade} (${result.ui_grade_letter})` },
                  ].map(row => (
                    <div key={row.label} className={`rounded-lg p-2.5 border ${row.highlight ? "bg-amber-500/10 border-amber-500/30" : "bg-secondary/40 border-secondary"}`}>
                      <div className="text-xs text-muted-foreground">{row.label}</div>
                      <div className={`text-xl font-black font-mono mt-0.5 ${row.highlight ? "text-amber-600 dark:text-amber-400" : ""}`}>{row.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{row.note}</div>
                    </div>
                  ))}
                </div>
                <MetricBar label="UHML — Upper Half Mean Length (in)" value={result.uhml_inches} unit="″"
                  min={0.6} max={1.7} good_lo={1.0} good_hi={1.7} />
                <div className="mt-3">
                  <MetricBar label="SFC by number (< 12.7 mm)" value={result.sfc_n} unit="%"
                    min={0} max={40} good_lo={0} good_hi={9.9} invert />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Staple Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 px-4 py-3 text-center">
                  <div className="text-xs text-muted-foreground">Staple Grade</div>
                  <div className="font-bold text-base mt-0.5">{result.staple_grade?.name ?? "—"}</div>
                  <div className="text-xs text-amber-600 mt-1">{result.uhml_inches?.toFixed(3)}″ ({result.uhml_mm} mm)</div>
                </div>
                <div className="text-xs text-muted-foreground">Examples: {result.staple_grade?.examples ?? "—"}</div>
                <div className="space-y-1.5 pt-1 border-t text-xs">
                  {[
                    ["ELS > 1.375\"",    "bg-green-500"],
                    ["Long 1.125–1.375\"","bg-blue-500"],
                    ["Med-Long 1.0–1.125\"","bg-sky-400"],
                    ["Medium 0.875–1.0\"","bg-amber-500"],
                    ["Short < 0.875\"",  "bg-red-400"],
                  ].map(([label, color]) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ══ HVI Color Grade + Spinnability ═══════════════════════ */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  HVI Colour Grade (USDA Nickerson-Hunter)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-secondary/40 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">Rd — Reflectance</div>
                    <div className="text-2xl font-black font-mono mt-0.5">{result.rd?.toFixed(1) ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">whiteness proxy</div>
                  </div>
                  <div className="rounded-lg border bg-secondary/40 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">+b — Yellowness</div>
                    <div className="text-2xl font-black font-mono mt-0.5">{result.plus_b?.toFixed(1) ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">lower = better</div>
                  </div>
                  <div className="rounded-lg border bg-amber-500/10 border-amber-500/30 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">USDA Grade</div>
                    <div className="text-xl font-black text-amber-600 mt-0.5">{result.color_grade_code ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{result.color_grade ?? "—"}</div>
                  </div>
                </div>
                <MetricBar label="Rd — Reflectance (whiteness)" value={result.rd} unit="" min={45} max={92} good_lo={69} good_hi={92} />
                <MetricBar label="+b — Yellowness (lower = better)" value={result.plus_b} unit="" min={4} max={18} good_lo={4} good_hi={10.5} invert />
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground">Trash content</span>
                  <span className={`font-mono font-semibold ${result.trash_percent > 2 ? "text-red-500" : result.trash_percent > 1 ? "text-amber-500" : "text-green-600"}`}>
                    {result.trash_percent?.toFixed(2) ?? "—"}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Spinnability Indices
                  <span className="ml-auto text-xs font-normal text-muted-foreground">USTER® HVI formula</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-blue-500/10 border-blue-500/20 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">SCI</div>
                    <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">{result.sci?.toFixed(0) ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">Spinning Consistency Index</div>
                  </div>
                  <div className="rounded-lg border bg-secondary/40 px-3 py-2.5 text-center">
                    <div className="text-xs text-muted-foreground">IPI</div>
                    <div className="text-3xl font-black font-mono">{result.ipi?.toFixed(0) ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">Imperfection Index</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
                  SCI = −414.67 + 2.9×STR + 49.17×UHML + 4.75×UI − 9.32×MIC + 0.67×Rd + 0.36×(+b)
                </div>
                <MetricBar label="Maturity Ratio (AFIS proxy)" value={result.maturity_ratio} unit="" min={0.6} max={1.0} good_lo={0.85} good_hi={1.0} />
                <MetricBar label="SCI (Spinning Consistency Index)" value={result.sci} unit="" min={0} max={400} good_lo={100} good_hi={400} />
              </CardContent>
            </Card>
          </div>

          {/* Two-column metrics */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* Fiber quality metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Microscope className="h-4 w-4 text-amber-500" />
                  Fiber Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricBar label="Uniformity Index (%)" value={result.uniformity_index} unit="%" min={50} max={100} good_lo={82} good_hi={100} />
                <MetricBar label="Micronaire (fineness, µg/in)" value={result.micronaire} unit="" min={2.5} max={7.5} good_lo={3.5} good_hi={4.9} />
                <MetricBar label="Nep Index (per g equiv.)" value={Math.min(result.nep_index, 500)} unit="" min={0} max={500} good_lo={0} good_hi={199} invert />
                <MetricBar label="Short Fiber Index (%)" value={result.short_fiber_index} unit="%" min={0} max={40} good_lo={0} good_hi={9.9} invert />
                <MetricBar label="Hairiness Index (H)" value={result.hairiness_index} unit="" min={2} max={14} good_lo={3} good_hi={7} invert />
                <MetricBar label="Elongation Index (%)" value={result.elongation_index} unit="%" min={3} max={14} good_lo={6} good_hi={14} />
              </CardContent>
            </Card>

            {/* USTER CSP benchmarks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  USTER® CSP Benchmarks — {result.benchmark.ne_range}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {result.benchmark.spinning_system} · USTER® Statistics 2023
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Excellent (top 25%)", value: result.benchmark.csp_excellent, color: "bg-green-500" },
                    { label: "Good (25–50%)", value: result.benchmark.csp_good, color: "bg-blue-500" },
                    { label: "Average (50–75%)", value: result.benchmark.csp_average, color: "bg-amber-500" },
                    { label: "Below avg (75–95%)", value: result.benchmark.csp_below, color: "bg-red-400" },
                    { label: "Minimum (95th %ile)", value: result.benchmark.csp_minimum, color: "bg-red-700" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3 text-sm">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${row.color}`} />
                      <span className="flex-1 text-muted-foreground">{row.label}</span>
                      <span className="font-mono font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold text-sm">Your CSP</span>
                  <span className={`text-xl font-black font-mono ${GRADE_COLOR[result.grade]}`}>{result.csp}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>USTER® percentile</span>
                  <span className="font-medium">{result.benchmark.uster_percentile}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fabric structure + ITMF */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-500" />
                  Fabric Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Warp threads/inch", result.warp_tpi],
                  ["Weft threads/inch", result.weft_tpi],
                  ["Cover factor", result.cover_factor],
                  ["Twist angle", `${result.twist_angle}°`],
                  ["Dominant fiber orientation", `${result.fiber_orientation_deg}°`],
                  ["Weave structure", result.weave_type],
                  ["Spinning system", result.spinning_system],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between border-b border-secondary pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium font-mono">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  ITMF Count Variation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">CV% of count</span>
                    <span className={`font-bold font-mono ${result.itmf_cv.cv_percent < 3 ? "text-green-600" : result.itmf_cv.cv_percent < 5 ? "text-amber-500" : "text-red-500"}`}>
                      {result.itmf_cv.cv_percent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${result.itmf_cv.cv_percent < 3 ? "bg-green-500" : result.itmf_cv.cv_percent < 5 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(result.itmf_cv.cv_percent / 8 * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ITMF-CIG 2021: {result.itmf_cv.status} (limits: &lt;2% excellent, &lt;3% good, &lt;5% acceptable)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                  <div><span className="text-muted-foreground">End count range:</span><br /><span className="font-semibold">{result.cotton_type.end_count_range}</span></div>
                  <div><span className="text-muted-foreground">Market share:</span><br /><span className="font-semibold">{result.cotton_type.market_share ?? "—"}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Price premium:</span> <span className="font-semibold">{result.cotton_type.price_premium ?? "—"}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ══ Cotton Type + Country of Origin ═════════════════════ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wheat className="h-4 w-4 text-amber-600" />
                Cotton Type Classification &amp; Country of Origin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Type hero */}
              <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-1">
                  <div className="text-xs text-muted-foreground">Classified as</div>
                  <div className="text-2xl font-black">{result.cotton_type.name}</div>
                  <div className="text-sm text-muted-foreground">{result.cotton_type.description}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { label: "Staple length", val: result.cotton_type.staple_length },
                    { label: "UHML range",    val: result.cotton_type.uhml_range ?? result.cotton_type.staple_length },
                    { label: "Micronaire",    val: result.cotton_type.micronaire },
                    { label: "Strength",      val: result.cotton_type.strength_gptex },
                    { label: "End count",     val: result.cotton_type.end_count_range },
                    { label: "Market share",  val: result.cotton_type.market_share ?? "—" },
                  ].map(row => (
                    <div key={row.label} className="rounded-lg border bg-background px-3 py-2">
                      <div className="text-muted-foreground">{row.label}</div>
                      <div className="font-semibold mt-0.5">{row.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Varieties */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Known Varieties</div>
                <div className="flex flex-wrap gap-1.5">
                  {(result.cotton_type.varieties ?? result.cotton_type.examples)
                    .split(",").map((v: string) => v.trim()).filter(Boolean).map((v: string) => (
                    <span key={v} className="text-xs bg-secondary border border-secondary px-2 py-0.5 rounded-full">{v}</span>
                  ))}
                </div>
              </div>

              {/* Typical uses */}
              <div className="text-sm border-l-2 border-amber-400 pl-3 py-1">
                <span className="text-muted-foreground text-xs">Typical applications: </span>
                {result.cotton_type.typical_uses}
              </div>

              {/* Countries of origin */}
              {result.cotton_type.countries_of_origin && result.cotton_type.countries_of_origin.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Countries of Origin — {result.cotton_type.countries_of_origin.length} major producers
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {result.cotton_type.countries_of_origin.map((c, i) => (
                      <div key={i} className="rounded-lg border bg-secondary/30 px-3 py-2.5 space-y-0.5">
                        <div className="font-semibold text-sm">{c.country}</div>
                        <div className="text-xs text-muted-foreground">{c.region}</div>
                        <div className="text-xs text-amber-600 dark:text-amber-400">{c.varieties}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price premium */}
              {result.cotton_type.price_premium && (
                <div className="flex items-center gap-3 rounded-lg bg-green-500/5 border border-green-500/20 px-4 py-2.5 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">Market price premium: </span>
                    <span className="font-semibold text-green-700 dark:text-green-400">{result.cotton_type.price_premium}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BCI checks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Better Cotton Initiative (BCI) Quality Checks
                <span className={`ml-auto text-xs font-normal px-2.5 py-1 rounded-full ${result.bci_status.passed === result.bci_status.total ? "bg-green-500/10 text-green-600" : result.bci_status.passed >= 4 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}>
                  {result.bci_status.status} · {result.bci_status.passed}/{result.bci_status.total}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(result.bci_status.checks).map(([label, passed]) => (
                  <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${passed ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"}`}>
                    {passed ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Findings + Recommendations */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Analysis Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground font-mono text-xs shrink-0 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className={`flex gap-2 text-sm rounded-lg px-3 py-2 ${r.startsWith("All key") ? "bg-green-500/5 border border-green-500/20" : "bg-amber-500/5 border border-amber-500/20"}`}>
                      {r.startsWith("All key")
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Standards */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Industry Standards Referenced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                {result.standard_refs.map((ref, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500 shrink-0">•</span>{ref}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                Method: INS-CSP-002 · Classical CV (OpenCV + scikit-image) · <strong>No AI/ML models</strong>
                {" · "}ID: {result.analysis_id}
                {" · "}{result.timestamp}
                {" · "}{result.processing_ms} ms
              </p>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
