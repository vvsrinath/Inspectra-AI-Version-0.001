import { LabReportTable } from "@/components/LabReportTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  apiFetch,
  downloadComparisonPdf,
  downloadCsv,
  type BatchComparisonResult,
} from "@/lib/api";
import { saveReport } from "@/lib/report-store";
import { Download, FileImage, Loader2, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function ComparePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [lotId, setLotId] = useState("C:05465");
  const [millName, setMillName] = useState("");
  const [operator, setOperator] = useState("MMN");
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchComparisonResult | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, 10));
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 10,
  });

  const runComparison = async () => {
    if (files.length < 2) {
      setError("Upload at least 2 sample images.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("lot_id", lotId);
      formData.append("mill_name", millName);
      formData.append("operator", operator);
      files.forEach((f) => formData.append("samples", f));

      const res = await apiFetch("/compare-batch", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as BatchComparisonResult;
      setResult(data);
      await saveReport({
        id: data.analysis_id,
        workspace_id: data.workspace_id ?? "",
        type: "batch",
        created_at: Date.now(),
        label: lotId,
        payload: data,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const handleComparisonPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      await downloadComparisonPdf(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleComparisonCsv = async () => {
    if (!result) return;
    setDownloadingCsv(true);
    setError(null);
    try {
      await downloadCsv({ ...result, report_type: "comparison" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV download failed");
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          Classical CV only — no AI / ML models
        </div>
        <h1 className="text-3xl font-bold mb-2">Compare Lab Reports</h1>
        <p className="text-muted-foreground">Upload 2–10 lab reports.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <label className="text-sm">
            Lot ID
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Mill name
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
              value={millName}
              onChange={(e) => setMillName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Operator
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      <Card className="border-dashed border-2">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`p-6 sm:p-10 flex flex-col items-center cursor-pointer touch-target ${
              isDragActive ? "bg-primary/5" : "hover:bg-secondary/30"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-10 w-10 text-primary mb-3" />
            <p className="font-medium">Drop 2–10 sample images to compare</p>
            <p className="text-sm text-muted-foreground mt-1">{files.length} file(s) selected</p>
          </div>
          {files.length > 0 && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="text-xs bg-secondary px-2 py-1 rounded flex items-center gap-1"
                >
                  <FileImage className="h-3 w-3" />
                  S{i + 1}: {f.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <Button
        size="lg"
        className="w-full sm:w-auto min-h-12 touch-target"
        onClick={runComparison}
        disabled={loading || files.length < 2}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Running classical comparison...
          </>
        ) : (
          "Generate comparison report"
        )}
      </Button>

      {result && (
        <div className="space-y-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Lab comparison ready
                  </p>
                  <p className="text-sm">
                    Lot {result.report_meta.lot_id} · {result.sample_count} samples ·{" "}
                    {result.processing_ms} ms · Grade {result.grade}
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    Batch verdict:{" "}
                    <span
                      className={
                        result.verdict === "UNIFORM"
                          ? "text-green-600"
                          : result.verdict === "VARIABLE"
                            ? "text-amber-600"
                            : "text-destructive"
                      }
                    >
                      {result.verdict}
                    </span>
                  </p>
                </div>
                <div className="stack-mobile">
                  <Button className="btn-mobile-full touch-target" onClick={handleComparisonPdf} disabled={downloadingPdf}>
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download comparison PDF
                  </Button>
                  <Button className="btn-mobile-full touch-target" variant="outline" onClick={handleComparisonCsv} disabled={downloadingCsv}>
                    {downloadingCsv ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparison table</CardTitle>
            </CardHeader>
            <CardContent>
              <LabReportTable rows={result.rows} columns={result.columns} />
              <p className="text-sm font-semibold mt-4">
                Total Number of Samples - {result.sample_count}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis &amp; explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {result.explanation.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
