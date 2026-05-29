import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
import type { Tool } from "@/lib/tools";

type JobStatusResponse = {
  status: "queued" | "running" | "done" | "error";
  step: number;
  stepsTotal: number;
  message?: string | null;
};

function getConversionApiUrl(pathname: string) {
  const base = (import.meta.env.VITE_CONVERSION_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  return `${base}${pathname}`;
}

async function readJsonOrThrow(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(
      `${fallbackMessage}. The backend returned HTML instead of JSON. Set VITE_CONVERSION_API_BASE_URL to the hosted conversion server URL. ${preview ? `Preview: ${preview}` : ""}`.trim(),
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${fallbackMessage}. The backend returned invalid JSON.`);
  }
}

export function UploadModal({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "processing" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => setFile(files[0] ?? null),
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  useEffect(() => {
    return () => {
      if (downloadUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const reset = () => {
    if (downloadUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(downloadUrl);
    }
    setFile(null);
    setStage("idle");
    setProgress(0);
    setJobId(null);
    setDownloadUrl(null);
  };

  async function pollJob(nextJobId: string) {
    while (true) {
      const response = await fetch(getConversionApiUrl(`/status/${nextJobId}`));
      const data = (await readJsonOrThrow(response, "Could not read job status")) as JobStatusResponse;

      if (!response.ok) {
        throw new Error(data?.message || "Could not read job status");
      }

      const totalSteps = Math.max(data.stepsTotal || 4, 1);
      const computedProgress = Math.min(95, Math.max(10, Math.round((data.step / totalSteps) * 100)));
      setProgress(computedProgress);

      if (data.status === "done") {
        setProgress(100);
        setDownloadUrl(getConversionApiUrl(`/download/${nextJobId}`));
        setStage("done");
        return;
      }

      if (data.status === "error") {
        throw new Error(data.message || "Processing failed");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    }
  }

  const convert = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!file) return;

    const currentBalance = profile?.wallet_balance ?? profile?.tokens ?? 0;
    if (currentBalance < tool.costInr) {
      toast.error("Not enough wallet balance. Please top up first.");
      return;
    }

    setStage("processing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(getConversionApiUrl("/upload"), {
        method: "POST",
        body: formData,
      });

      const uploadData = await readJsonOrThrow(uploadResponse, "Upload failed");
      if (!uploadResponse.ok) {
        throw new Error((uploadData as { error?: string })?.error || "Upload failed");
      }

      const nextJobId = String(uploadData.job_id ?? "");
      if (!nextJobId) {
        throw new Error("Missing job id from server");
      }

      setJobId(nextJobId);
      await pollJob(nextJobId);

      const { error: debitError } = await (supabase as any).rpc("spend_wallet_for_conversion", {
        p_user_id: user.id,
        p_amount: tool.costInr,
        p_tool: tool.name,
        p_file_name: file.name,
      });

      if (debitError) {
        throw new Error(debitError.message || "Conversion completed but wallet deduction failed");
      }

      await refreshProfile();
    } catch (error) {
      setStage("idle");
      setProgress(0);
      setJobId(null);
      setDownloadUrl(null);
      toast.error(error instanceof Error ? error.message : "Processing failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-md border border-border p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="label-eyebrow text-terracotta">Selected Tool</p>
            <h2 className="font-display text-3xl mt-1">{tool.name}</h2>
            {/* <p className="text-sm text-muted-foreground mt-1">Uses the same upload/status/download backend API as the hosted HTML</p> */}
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        {stage === "idle" && (
          <>
            <div {...getRootProps()}
              className={`bg-beige border-2 border-dashed rounded p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-terracotta bg-terracotta/5" : "border-terracotta/70"}`}>
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-3 text-terracotta" />
              <p className="font-medium">Drop your file or folder here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">.DWG · .DXF · .PDF · .PNG · .JPG · .ZIP — up to 50MB</p>
            </div>
            {file && (
              <div className="mt-5 flex items-center justify-between border border-border rounded p-3">
                <div className="text-sm"><span className="font-medium">{file.name}</span> · {(file.size/1024/1024).toFixed(2)} MB</div>
                <button onClick={convert} className="bg-charcoal text-primary-foreground px-4 py-2 rounded text-sm">Convert Now</button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">The file is uploaded to the backend, processed there, and downloaded from the server result endpoint.</p>
          </>
        )}

        {stage === "processing" && (
          <div className="py-10">
            <div className="mb-3 flex items-center gap-3">
              <Loader2 className="animate-spin text-terracotta" />
              <span className="text-sm text-muted-foreground">Processing</span>
            </div>
            <div className="h-2 bg-beige rounded-full overflow-hidden">
              <div className="h-full bg-terracotta transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {stage === "done" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto text-olive mb-3" size={40} />
            <h3 className="font-display text-2xl">Conversion Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
            <a href={downloadUrl ?? "#"} download={file ? `processed-${file.name}` : undefined} className="mt-6 inline-block bg-charcoal text-primary-foreground px-6 py-2.5 rounded text-sm">
              Download File
            </a>
            <div className="mt-3"><button className="text-terracotta text-sm" onClick={reset}>Convert another</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
