import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, type AnalysisResult } from "@/lib/api";
import { saveReport } from "@/lib/report-store";
import { UploadCloud, FileImage, Loader2, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation } from "wouter";

export default function AnalyzePage() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotId, setLotId] = useState("");
  const [millName, setMillName] = useState("");
  const [operator, setOperator] = useState("MMN");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedInfo = acceptedFiles[0];
      setFile(selectedInfo);
      setPreview(URL.createObjectURL(selectedInfo));
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
  });

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (lotId) formData.append("lot_id", lotId);
      if (millName) formData.append("mill_name", millName);
      formData.append("operator", operator);

      const res = await apiFetch("/analyze-material", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Analysis failed (${res.status})`);
      }

      const data = (await res.json()) as AnalysisResult;
      sessionStorage.setItem("inspectra_analysis", JSON.stringify(data));

      await saveReport({
        id: data.analysis_id,
        workspace_id: data.workspace_id ?? "",
        type: "single",
        created_at: Date.now(),
        label: lotId || undefined,
        payload: data,
      });

      navigate(`/results/${data.analysis_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-secondary/10 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          Classical CV only — no AI / ML models
        </div>
        <h1 className="text-3xl font-bold mb-2">Analyze fabric sample</h1>
        <p className="text-muted-foreground">Upload a single image for a full lab report.</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid md:grid-cols-3 gap-4">
          <label className="text-sm">
            Lot ID
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              placeholder="e.g. C:05465"
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
            <p className="font-medium">
              {isDragActive ? "Drop image here" : "Drop fabric image or click to upload"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, WebP supported</p>
          </div>
          {preview && (
            <div className="px-4 pb-4">
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 rounded-lg object-contain mx-auto border"
              />
              <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <FileImage className="h-3 w-3" />
                {file?.name}
              </p>
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
        onClick={handleAnalyze}
        disabled={!file || analyzing}
      >
        {analyzing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Analyzing fabric…
          </>
        ) : (
          <>
            Run analysis
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
