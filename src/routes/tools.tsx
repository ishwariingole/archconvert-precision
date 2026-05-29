import { createFileRoute } from "@tanstack/react-router";
import { ToolsGrid } from "@/components/site/ToolsGrid";
import { FadeIn } from "@/components/site/FadeIn";

export const Route = createFileRoute("/tools")({
  component: ToolsPage,
  head: () => ({
    meta: [
      { title: "Tools — ArchConvert" },
      { name: "description", content: "Greyscale" },
      { property: "og:title", content: "Tools — ArchConvert" },
      { property: "og:description", content: "Four professional conversion pipelines for architectural drawings." },
    ],
  }),
});

function ToolsPage() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="label-eyebrow text-terracotta">Tools</p>
          <h1 className="font-display text-5xl mt-3">Choose Your Conversion Pipeline</h1>
          <p className="text-muted-foreground mt-3 max-w-xl">Four pipelines built around how architects actually work with drawings.</p>
        </FadeIn>
        <div className="mt-12"><ToolsGrid /></div>
      </div>
    </section>
  );
}
