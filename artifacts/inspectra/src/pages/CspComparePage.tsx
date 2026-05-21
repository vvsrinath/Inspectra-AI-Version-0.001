import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveApiBase } from "@/lib/api-base";
import { apiHeaders } from "@/lib/workspace";
import {
  UploadCloud, FileImage, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Wheat, Download, FileText, FileSpreadsheet,
  HardDrive, Trophy, TrendingDown, BarChart3, Microscope,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

/* ─── types ────────────────────────────────────────────── */
interface SampleResult {
  sample_name: string; filename: string; rank: number;
  csp: number; grade: string; grade_label: string; quality_score: number;
  estimated_ne: number; strength_factor: number;
  uhml_inches: number; uhml_mm: number; mean_length_inches: number;
  sfc_n: number; sfc_w: number; staple_grade: { name: string };
  uniformity_index: number; ui_grade: string;
  micronaire: number; elongation_index: number;
  nep_index: number; short_fiber_index: number;
  hairiness_index: number; maturity_ratio: number;
  sci: number; ipi: number;
  rd: number; plus_b: number; color_grade: string; color_grade_code: string;
  trash_percent: number; cover_factor: number;
  weave_type: string; spinning_system: string; twist_angle: number;
  bci_status: { passed: number; total: number; status: string; checks: Record<string, boolean> };
  cotton_type: { name: string; examples: string };
  recommendations: string[];
  analysis_id: string; timestamp: string;
}
interface StatEntry {
  mean: number; std: number; cv_percent: number;
  min: number; max: number; best_idx: number; worst_idx: number;
}
interface CompareResult {
  results: SampleResult[];
  stats: Record<string, StatEntry>;
  sample_count: number; compare_id: string;
  timestamp: string; lot_id: string; mill_name: string; operator: string;
}
interface SampleFile { file: File; preview: string; name: string }

/* ─── grade helpers ─────────────────────────────────────── */
const GRADE_COLOR: Record<string, string> = {
  A: "text-green-600 dark:text-green-400",
  B: "text-blue-600 dark:text-blue-400",
  C: "text-amber-500 dark:text-amber-400",
  D: "text-red-600 dark:text-red-400",
};
const GRADE_BG: Record<string, string> = {
  A: "bg-green-500/10 border-green-500/20",
  B: "bg-blue-500/10 border-blue-500/20",
  C: "bg-amber-500/10 border-amber-500/20",
  D: "bg-red-500/10 border-red-500/20",
};

/* ─── Table column definitions ──────────────────────────── */
const COLS: {
  key: keyof SampleResult | string;
  label: string; unit?: string; dec?: number; higherBetter: boolean;
}[] = [
  { key: "csp",              label: "CSP Score",         higherBetter: true },
  { key: "sci",              label: "SCI",                higherBetter: true },
  { key: "estimated_ne",     label: "Ne (count)",         higherBetter: true, dec: 1 },
  { key: "uhml_inches",      label: "UHML (in)",          higherBetter: true, dec: 3 },
  { key: "uhml_mm",          label: "UHML (mm)",          higherBetter: true, dec: 1 },
  { key: "mean_length_inches", label: "ML (in)",          higherBetter: true, dec: 3 },
  { key: "sfc_n",            label: "SFC_n (%)",  unit:"%",higherBetter: false, dec: 1 },
  { key: "uniformity_index", label: "UI (%)",     unit:"%",higherBetter: true, dec: 1 },
  { key: "micronaire",       label: "Micronaire",          higherBetter: false, dec: 2 },
  { key: "strength_factor",  label: "Strength (g/tex)",   higherBetter: true, dec: 2 },
  { key: "elongation_index", label: "Elongation (%)", unit:"%", higherBetter: true, dec: 1 },
  { key: "nep_index",        label: "Nep (/g)",            higherBetter: false, dec: 0 },
  { key: "short_fiber_index",label: "SFI (%)",    unit:"%", higherBetter: false, dec: 1 },
  { key: "hairiness_index",  label: "Hairiness H",         higherBetter: false, dec: 2 },
  { key: "maturity_ratio",   label: "Maturity",            higherBetter: true, dec: 3 },
  { key: "rd",               label: "Rd (refl.)",          higherBetter: true, dec: 1 },
  { key: "plus_b",           label: "+b (yellow)",         higherBetter: false, dec: 1 },
  { key: "trash_percent",    label: "Trash (%)",  unit:"%", higherBetter: false, dec: 2 },
  { key: "cover_factor",     label: "Cover K",             higherBetter: true, dec: 3 },
  { key: "ipi",              label: "IPI",                  higherBetter: false, dec: 0 },
];

function cellBg(idx: number, stat?: StatEntry, higherBetter?: boolean): string {
  if (!stat) return "";
  const best  = stat.best_idx;
  const worst = stat.worst_idx;
  if (idx === best)  return "bg-green-500/15 font-bold";
  if (idx === worst) return "bg-red-500/10";
  return "";
}

/* ─── CSV export (client-side) ──────────────────────────── */
function exportCsv(data: CompareResult) {
  const header = ["Metric", ...data.results.map(r => r.sample_name), "Mean", "Std", "CV%", "Best"];
  const rows = COLS.map(col => {
    const vals = data.results.map(r => String((r as unknown as Record<string, unknown>)[col.key] ?? ""));
    const st   = data.stats[col.key as string];
    return [
      col.label, ...vals,
      st ? String(st.mean) : "",
      st ? String(st.std)  : "",
      st ? String(st.cv_percent) : "",
      st ? `Sample ${st.best_idx + 1}` : "",
    ];
  });
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `Inspectra-CSP-Compare-${data.compare_id}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ─── PDF export via backend ─────────────────────────────── */
async function exportPdf(data: CompareResult) {
  const base = resolveApiBase();
  const res  = await fetch(`${base}/csp-report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiHeaders() as Record<string, string>) },
    body: JSON.stringify({ ...data.results[0], report_type: "comparison", compare_data: data }),
  });
  if (!res.ok) throw new Error(`PDF failed (${res.status})`);
  const { pdf_base64 } = await res.json() as { pdf_base64: string };
  const a = document.createElement("a");
  a.href = `data:application/pdf;base64,${pdf_base64}`;
  a.download = `Inspectra-CSP-Compare-${data.compare_id}.pdf`;
  a.click();
}

/* ─── Page ───────────────────────────────────────────────── */
export default function CspComparePage() {
  const [samples, setSamples]       = useState<SampleFile[]>([]);
  const [lotId, setLotId]           = useState("");
  const [millName, setMillName]     = useState("");
  const [operator, setOperator]     = useState("MMN");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<CompareResult | null>(null);
  const [busyPdf, setBusyPdf]       = useState(false);
  const [busyCsv, setBusyCsv]       = useState(false);
  const [dlErr, setDlErr]           = useState<string | null>(null);
  const previewsRef = useRef<string[]>([]);

  const onDrop = useCallback((files: File[]) => {
    setSamples(prev => {
      const combined = [...prev];
      files.forEach(f => {
        if (combined.length < 10) {
          const url = URL.createObjectURL(f);
          previewsRef.current.push(url);
          combined.push({ file: f, preview: url, name: f.name.replace(/\.[^.]+$/, "") });
        }
      });
      return combined;
    });
    setError(null); setResult(null); setDlErr(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [".jpg",".jpeg",".png",".webp"] }, multiple: true,
  });

  useEffect(() => () => previewsRef.current.forEach(URL.revokeObjectURL), []);

  const removeSample = (i: number) => setSamples(s => s.filter((_, j) => j !== i));
  const renameS = (i: number, v: string) =>
    setSamples(s => s.map((x, j) => j === i ? { ...x, name: v } : x));

  const handleCompare = async () => {
    if (samples.length < 2) { setError("Upload at least 2 samples."); return; }
    setLoading(true); setError(null); setDlErr(null);
    try {
      const fd = new FormData();
      samples.forEach(s => fd.append("files", s.file));
      fd.append("sample_names", samples.map(s => s.name).join(","));
      if (lotId)    fd.append("lot_id", lotId);
      if (millName) fd.append("mill_name", millName);
      fd.append("operator", operator);
      const res = await fetch(`${resolveApiBase()}/csp-compare`, {
        method: "POST", body: fd, headers: apiHeaders() as HeadersInit,
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).detail) ?? `Failed (${res.status})`);
      setResult(await res.json() as CompareResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally { setLoading(false); }
  };

  const wrap = async (setter: (v: boolean) => void, fn: () => Promise<void>) => {
    setter(true); setDlErr(null);
    try { await fn(); } catch (e) { setDlErr(e instanceof Error ? e.message : "Failed"); }
    finally { setter(false); }
  };

  const best  = result ? result.results.find(r => r.rank === 1) : null;
  const worst = result ? result.results.reduce((a, b) => b.rank > a.rank ? b : a) : null;

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-5">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium mb-3">
          <Wheat className="h-3 w-3" />
          HVI-grade comparison · USTER® 2023 · Classical CV · No AI/ML
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-1">
          <BarChart3 className="h-8 w-8 text-amber-600" />
          Cotton CSP Comparison Report
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload 2–10 cotton fabric images. Each is analysed for 20+ HVI-equivalent metrics
          (UHML, SCI, SFC, Rd/+b color grade, IPI, maturity…) and compared side-by-side against
          USTER® Statistics 2023 benchmarks.
        </p>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-5 pb-5 grid md:grid-cols-3 gap-4">
          {[
            { label: "Lot ID",    val: lotId,    set: setLotId,    ph: "e.g. C:05465" },
            { label: "Mill name", val: millName, set: setMillName, ph: "" },
            { label: "Operator",  val: operator, set: setOperator, ph: "MMN" },
          ].map(f => (
            <label key={f.label} className="text-sm font-medium">
              {f.label}
              <input className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
                value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Upload zone */}
      <Card className="border-dashed border-2">
        <CardContent className="p-0">
          <div {...getRootProps()} className={`p-6 flex flex-col items-center cursor-pointer transition-colors ${isDragActive ? "bg-amber-500/5" : "hover:bg-secondary/30"}`}>
            <input {...getInputProps()} />
            <UploadCloud className="h-9 w-9 text-amber-500 mb-2" />
            <p className="font-medium">{isDragActive ? "Drop here" : "Drop 2–10 cotton fabric images or click to browse"}</p>
            <p className="text-xs text-muted-foreground mt-1">{samples.length}/10 loaded · JPEG · PNG · WebP</p>
          </div>

          {samples.length > 0 && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {samples.map((s, i) => (
                  <div key={i} className="relative group border rounded-lg overflow-hidden bg-secondary/30">
                    <img src={s.preview} alt={s.name} className="w-full h-20 object-cover" />
                    <div className="p-1.5">
                      <input
                        className="w-full text-xs border rounded px-1.5 py-1 bg-background"
                        value={s.name}
                        onChange={e => renameS(i, e.target.value)}
                        placeholder={`Sample ${i + 1}`}
                      />
                    </div>
                    <button onClick={() => removeSample(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      S{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">{error}</p>}

      <Button size="lg" className="w-full sm:w-auto min-h-12 bg-amber-600 hover:bg-amber-700"
        onClick={handleCompare} disabled={samples.length < 2 || loading}>
        {loading
          ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Analysing {samples.length} samples…</>
          : <><Microscope className="mr-2 h-4 w-4" />Run CSP Comparison ({samples.length} samples)</>}
      </Button>

      {/* ─── Results ─────────────────────────────────────── */}
      {result && (
        <div className="space-y-5">

          {/* Summary heroes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 mb-1">
                  <Trophy className="h-3.5 w-3.5" />Best Sample
                </div>
                <p className="font-bold text-lg">{best?.sample_name}</p>
                <p className="text-2xl font-black text-green-600">{best?.csp}</p>
                <p className="text-xs text-muted-foreground">CSP · Grade {best?.grade}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-red-600 mb-1">
                  <TrendingDown className="h-3.5 w-3.5" />Lowest Sample
                </div>
                <p className="font-bold text-lg">{worst?.sample_name}</p>
                <p className="text-2xl font-black text-red-500">{worst?.csp}</p>
                <p className="text-xs text-muted-foreground">CSP · Grade {worst?.grade}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Mean CSP</div>
                <p className="text-3xl font-black">{result.stats["csp"]?.mean}</p>
                <p className="text-xs text-muted-foreground">σ {result.stats["csp"]?.std} · CV {result.stats["csp"]?.cv_percent}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Mean UHML / SCI</div>
                <p className="text-2xl font-bold">{result.stats["uhml_inches"]?.mean}″</p>
                <p className="text-sm font-semibold text-amber-600">SCI {result.stats["sci"]?.mean}</p>
                <p className="text-xs text-muted-foreground">{result.sample_count} samples · {result.timestamp}</p>
              </CardContent>
            </Card>
          </div>

          {/* Download bar */}
          <Card>
            <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />Download comparison
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" disabled={busyPdf}
                  onClick={() => wrap(setBusyPdf, () => exportPdf(result))}>
                  {busyPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-500" />}
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-2" disabled={busyCsv}
                  onClick={() => { setBusyCsv(true); try { exportCsv(result); } finally { setBusyCsv(false); } }}>
                  {busyCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                  CSV
                </Button>
              </div>
              {dlErr && <p className="text-sm text-destructive">{dlErr}</p>}
            </CardContent>
          </Card>

          {/* Rankings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Sample Rankings — by CSP Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...result.results]
                  .sort((a, b) => a.rank - b.rank)
                  .map(r => (
                    <div key={r.analysis_id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${r.rank === 1 ? "bg-green-500/10 border-green-500/30" : r.rank === result.sample_count ? "bg-red-500/10 border-red-500/20" : "bg-secondary/30 border-secondary"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${r.rank === 1 ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                        {r.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{r.sample_name}</p>
                        <p className="text-xs text-muted-foreground">{r.cotton_type.name} · {r.spinning_system} · {r.weave_type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-black font-mono ${GRADE_COLOR[r.grade]}`}>{r.csp}</p>
                        <p className="text-xs text-muted-foreground">Grade {r.grade} · SCI {r.sci?.toFixed(0)}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-medium border ${GRADE_BG[r.grade]} ${GRADE_COLOR[r.grade]}`}>
                        {r.grade_label}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Main HVI comparison table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Full HVI Metrics Comparison
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  🟢 best · 🔴 worst in each metric
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-secondary/50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground sticky left-0 bg-secondary/50 min-w-[160px]">
                        Metric
                      </th>
                      {result.results.map((r, i) => (
                        <th key={i} className="px-3 py-2 text-center font-medium min-w-[100px]">
                          <div className="truncate max-w-[90px] mx-auto">{r.sample_name}</div>
                          <div className={`text-xs ${GRADE_COLOR[r.grade]}`}>Grade {r.grade}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-muted-foreground min-w-[80px]">Mean</th>
                      <th className="px-3 py-2 text-center text-muted-foreground min-w-[70px]">CV%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COLS.map((col, ci) => {
                      const st = result.stats[col.key as string];
                      return (
                        <tr key={ci} className="border-b hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-2 text-muted-foreground sticky left-0 bg-background text-xs font-medium">
                            {col.label}
                          </td>
                          {result.results.map((r, ri) => {
                            const val = (r as unknown as Record<string, unknown>)[col.key as string];
                            const bg  = cellBg(ri, st, col.higherBetter);
                            return (
                              <td key={ri} className={`px-3 py-2 text-center font-mono text-xs ${bg}`}>
                                {typeof val === "number"
                                  ? val.toFixed(col.dec ?? 0)
                                  : String(val ?? "—")}
                                {col.unit ?? ""}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center text-xs font-mono text-muted-foreground">
                            {st ? st.mean.toFixed(col.dec ?? 1) : "—"}
                          </td>
                          <td className={`px-3 py-2 text-center text-xs font-mono ${st && st.cv_percent > 5 ? "text-amber-500" : "text-muted-foreground"}`}>
                            {st ? `${st.cv_percent}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Extra string rows */}
                    {[
                      { label: "Cotton Type",    key: "cotton_type" },
                      { label: "Color Grade",    key: "color_grade" },
                      { label: "Staple Grade",   key: "staple_grade" },
                      { label: "Spinning Sys.",  key: "spinning_system" },
                      { label: "Weave Type",     key: "weave_type" },
                      { label: "BCI Status",     key: "bci_status" },
                    ].map(row => (
                      <tr key={row.key} className="border-b hover:bg-secondary/20">
                        <td className="px-4 py-2 text-muted-foreground sticky left-0 bg-background text-xs font-medium">
                          {row.label}
                        </td>
                        {result.results.map((r, ri) => {
                          let display = "—";
                          if (row.key === "cotton_type")  display = r.cotton_type?.name ?? "—";
                          if (row.key === "color_grade")  display = `${r.color_grade ?? "—"} (${r.color_grade_code ?? ""})`;
                          if (row.key === "staple_grade") display = r.staple_grade?.name ?? "—";
                          if (row.key === "spinning_system") display = r.spinning_system ?? "—";
                          if (row.key === "weave_type")   display = r.weave_type ?? "—";
                          if (row.key === "bci_status")   display = `${r.bci_status?.passed}/${r.bci_status?.total}`;
                          return (
                            <td key={ri} className="px-3 py-2 text-center text-xs">{display}</td>
                          );
                        })}
                        <td colSpan={2} />
                      </tr>
                    ))}
                  </tbody>
                  {/* Stats footer */}
                  <tfoot>
                    <tr className="border-t bg-secondary/30">
                      <td className="px-4 py-2 text-xs font-bold sticky left-0 bg-secondary/30">
                        CSP Rank
                      </td>
                      {result.results.map((r, i) => (
                        <td key={i} className="px-3 py-2 text-center text-xs font-bold">
                          #{r.rank}
                        </td>
                      ))}
                      <td colSpan={2} className="px-3 py-2 text-xs text-muted-foreground text-center">
                        {result.compare_id}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* BCI grid per sample */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                BCI Quality Checks by Sample
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.results.map(r => (
                  <div key={r.analysis_id}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-semibold">{r.sample_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${r.bci_status.passed === r.bci_status.total ? "bg-green-500/10 text-green-600 border-green-500/20" : r.bci_status.passed >= 6 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                        {r.bci_status.status} · {r.bci_status.passed}/{r.bci_status.total}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(r.bci_status.checks).map(([k, v]) => (
                        <span key={k} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${v ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"}`}>
                          {v ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations per sample */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Recommendations per Sample
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.results.map(r => (
                <div key={r.analysis_id}>
                  <p className="text-sm font-semibold mb-1">{r.sample_name}</p>
                  <ul className="space-y-1">
                    {r.recommendations.map((rec, i) => (
                      <li key={i} className={`text-xs flex gap-2 rounded px-2 py-1.5 ${rec.startsWith("All key") ? "bg-green-500/5 text-green-700 dark:text-green-400" : "bg-amber-500/5 text-amber-700 dark:text-amber-400"}`}>
                        {rec.startsWith("All key") ? <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />}
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center border-t pt-3">
            Compare ID: {result.compare_id} · {result.timestamp} ·
            Method: INS-CSP-003 · Classical CV — OpenCV + scikit-image · <strong>No AI/ML models</strong>
          </p>
        </div>
      )}
    </div>
  );
}
