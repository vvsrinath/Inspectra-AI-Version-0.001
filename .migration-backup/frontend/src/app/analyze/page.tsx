"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, type AnalysisResult } from "@/lib/api";
import { saveReport } from "@/lib/report-store";
import { UploadCloud, FileImage, Loader2, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

export default function AnalyzePage() {
  const router = useRouter();
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
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          (errBody as { detail?: string }).detail ??
            `Analysis failed (${res.status}). Is the backend running?`
        );
      }

      const data = (await res.json()) as AnalysisResult;
      await saveReport({
        id: data.analysis_id,
        workspace_id: data.workspace_id ?? "",
        type: "single",
        created_at: Date.now(),
        label: data.report_meta?.lot_id,
        payload: data,
      });

      sessionStorage.setItem("inspectra_analysis", JSON.stringify(data));
      router.push(`/results/${data.analysis_id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Analysis failed. Please try again.";
      setError(message);
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-secondary/20 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload & Analyze</h1>
          <p className="text-muted-foreground">
            Classical CV analysis — no AI models. Results stay in your private workspace.
          </p>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-6 grid md:grid-cols-3 gap-4">
            <label className="text-sm">
              Lot ID (optional)
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 bg-background"
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                placeholder="C:05465"
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

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <Card className="border-dashed border-2 shadow-sm relative overflow-hidden bg-background">
          <CardContent className="p-0">
            {!preview ? (
              <div
                {...getRootProps()}
                className={`p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragActive ? "bg-primary/5 border-primary" : "hover:bg-secondary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="h-16 w-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Drag & Drop Image Here</h3>
                <p className="text-muted-foreground max-w-xs mb-6 text-sm">
                  Supports JPG, PNG, WEBP. Processed in-memory only.
                </p>
                <Button type="button">Browse Files</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-px bg-border">
                <div className="p-8 bg-background flex flex-col justify-center items-center">
                  <img
                    src={preview}
                    alt="Sample"
                    className="rounded-lg max-h-64 object-contain shadow-sm mb-6"
                  />
                  <Button type="button" variant="outline" onClick={clearImage} disabled={analyzing}>
                    Change Image
                  </Button>
                </div>
                <div className="p-8 bg-background flex flex-col justify-center">
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                      <FileImage className="h-5 w-5 text-primary" />
                      {file?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full h-14 text-lg rounded-xl"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analyzing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Run Diagnostics
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
