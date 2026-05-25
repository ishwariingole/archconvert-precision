import { useState } from "react";
import { TOOLS, type Tool } from "@/lib/tools";
import { UploadModal } from "./UploadModal";
import { FadeIn } from "./FadeIn";
import { ArrowRight, PenLine, Layers, Eraser, Sparkles } from "lucide-react";

const ICONS = [PenLine, Eraser, Layers, Sparkles];

export function ToolsGrid() {
  const [active, setActive] = useState<Tool | null>(null);
  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {TOOLS.map((t, i) => {
          const Icon = ICONS[i];
          return (
            <FadeIn key={t.id} delay={i * 80}>
              <div className="lift bg-card border border-border rounded p-7 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <Icon className="text-charcoal" strokeWidth={1.2} size={28} />
                  {t.badge && <span className="label-eyebrow bg-terracotta text-primary-foreground px-2 py-1 rounded">{t.badge}</span>}
                </div>
                <h3 className="font-display text-2xl">{t.name}</h3>
                <p className="text-sm text-muted-foreground mt-2 flex-1">{t.description}</p>
                <div className="flex items-center justify-between mt-6">
                  <span className="inline-flex items-center bg-charcoal text-primary-foreground px-3 py-1 rounded-full text-xs">
                    ₹{t.costInr} / conversion
                  </span>
                  <button onClick={() => setActive(t)} className="text-terracotta text-sm inline-flex items-center gap-1 hover:underline">
                    Use Tool <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
      {active && <UploadModal tool={active} onClose={() => setActive(null)} />}
    </>
  );
}
