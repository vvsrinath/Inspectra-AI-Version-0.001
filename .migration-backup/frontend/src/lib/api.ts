import { resolveApiBase } from "./api-base";
import { apiHeaders } from "./workspace";

export const METRIC_COLUMNS = [
  "SSIM",
  "TEX",
  "WVE",
  "SHP",
  "EDG",
  "UNF",
  "STN",
  "SIM",
  "QLY",
  "GRD",
] as const;

export type MetricColumn = (typeof METRIC_COLUMNS)[number];

export type MetricValues = Record<string, number | string>;

export type ReportRow = {
  test_id: string;
  values: MetricValues;
  verdict?: string;
};

export type ReportMeta = {
  lot_id: string;
  mill_name: string;
  operator: string;
  serial_no?: string;
  report_version?: string;
};

export type AnalysisResult = {
  analysis_id: string;
  workspace_id?: string;
  timestamp?: string;
  columns: string[];
  values: MetricValues;
  metrics: MetricValues;
  rows: ReportRow[];
  sample_count: number;
  verdict: string;
  findings: string[];
  explanation: string[];
  quality_score: number;
  similarity_score: number;
  quality_status: string;
  texture_analysis: string;
  pattern_analysis: string;
  grade: string;
  processing_ms: number;
  report_meta: ReportMeta;
  reference_insights?: string;
  recommendation?: string;
};

export type BatchComparisonResult = AnalysisResult & {
  report_type?: "comparison";
  statistics: {
    mean: MetricValues;
    std_dev: MetricValues;
    cv_percent: MetricValues;
  };
  sample_rows: ReportRow[];
};

export type StoredReport = {
  id: string;
  workspace_id: string;
  type: "single" | "batch";
  created_at: number;
  label?: string;
  payload: AnalysisResult | BatchComparisonResult;
};

function networkErrorMessage(path: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("ECONNREFUSED")
  ) {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      return `Cannot reach the API. Set INSPECTRA_API_URL on Vercel to your Render backend URL. Path: ${path}`;
    }
    return `Cannot reach the API. Run start.bat (backend :8000) and refresh. Path: ${path}`;
  }
  return msg || "Network request failed";
}

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const wsHeaders = apiHeaders();
  Object.entries(wsHeaders).forEach(([k, v]) => {
    if (typeof v === "string") headers.set(k, v);
  });
  const apiBase = resolveApiBase();
  const url = `${apiBase}${path}`;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (isFormData) {
    headers.delete("Content-Type");
  }
  try {
    const res = await fetch(url, { ...init, headers });
    return res;
  } catch (err) {
    throw new Error(networkErrorMessage(path, err));
  }
}

function pdfFilename(report: AnalysisResult | BatchComparisonResult): string {
  const lot = report.report_meta?.lot_id?.replace(/[^a-zA-Z0-9-]/g, "_") ?? "report";
  const isBatch =
    ("statistics" in report && report.sample_count > 1) ||
    (report as BatchComparisonResult & { report_type?: string }).report_type === "comparison";
  if (isBatch) {
    return `Inspectra-Comparison-${lot}-${report.analysis_id ?? "batch"}.pdf`;
  }
  return `Inspectra-LabReport-${lot}-${report.analysis_id ?? "single"}.pdf`;
}

export async function downloadPdf(report: AnalysisResult | BatchComparisonResult) {
  const res = await apiFetch("/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `PDF failed (${res.status})`);
  }
  const { pdf_base64 } = (await res.json()) as { pdf_base64: string };
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${pdf_base64}`;
  link.download = pdfFilename(report);
  link.click();
}

/** Download comparison PDF for multi-sample batch reports */
export async function downloadComparisonPdf(report: BatchComparisonResult) {
  const payload = { ...report, report_type: "comparison" as const };
  return downloadPdf(payload);
}

export async function downloadCsv(report: AnalysisResult | BatchComparisonResult) {
  const res = await apiFetch("/export-csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`CSV failed (${res.status})`);
  const text = await res.text();
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.analysis_id ?? "inspectra-report"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
