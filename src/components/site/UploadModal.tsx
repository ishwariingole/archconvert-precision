import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
import type { Tool } from "@/lib/tools";

export function UploadModal({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "processing" | "done">("idle");
  const [progress, setProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => setFile(files[0] ?? null),
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const convert = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!file) return;
    if ((profile?.tokens ?? 0) < tool.tokens) { toast.error("Not enough tokens. Top up to continue."); return; }
    setStage("processing"); setProgress(0);
    const t = setInterval(() => setProgress(p => Math.min(p + 8, 95)), 200);
    const newBalance = (profile?.tokens ?? 0) - tool.tokens;
    await supabase.from("profiles").update({ tokens: newBalance }).eq("id", user.id);
    await supabase.from("conversions").insert({
      user_id: user.id, tool: tool.name, file_name: file.name, tokens_used: tool.tokens, status: "completed",
    });
    setTimeout(async () => { clearInterval(t); setProgress(100); setStage("done"); await refreshProfile(); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-md border border-border p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="label-eyebrow text-terracotta">Selected Tool</p>
            <h2 className="font-display text-3xl mt-1">{tool.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{tool.tokens} {tool.tokens === 1 ? "Token" : "Tokens"}</p>
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
            <p className="text-xs text-muted-foreground mt-4">{tool.tokens} tokens will be deducted from your balance.</p>
          </>
        )}

        {stage === "processing" && (
          <div className="py-10">
            <div className="flex items-center gap-3 mb-4"><Loader2 className="animate-spin text-terracotta" /> <span>Processing {file?.name}…</span></div>
            <div className="h-1 bg-beige rounded overflow-hidden"><div className="h-full bg-terracotta transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {stage === "done" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto text-olive mb-3" size={40} />
            <h3 className="font-display text-2xl">Conversion Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
            <a href="#" download className="mt-6 inline-block bg-charcoal text-primary-foreground px-6 py-2.5 rounded text-sm">Download File</a>
            <div className="mt-3"><button className="text-terracotta text-sm" onClick={() => { setFile(null); setStage("idle"); setProgress(0); }}>Convert another</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
