import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FadeIn } from "@/components/site/FadeIn";
import { PaymentModal, type Plan } from "@/components/site/PaymentModal";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — ArchConvert" },
      { name: "description", content: "Transparent token-based pricing. No subscriptions, no expiry." },
      { property: "og:title", content: "Pricing — ArchConvert" },
      { property: "og:description", content: "Top-up token plans for architects and studios." },
    ],
  }),
});

const PLANS: Plan[] = [
  { name: "Starter", tokens: 50, price: 199 },
  { name: "Professional", tokens: 150, price: 499 },
  { name: "Studio", tokens: 500, price: 1299 },
];

function PricingPage() {
  const [active, setActive] = useState<Plan | null>(null);
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="label-eyebrow text-terracotta">Pricing</p>
          <h1 className="font-display text-5xl mt-3">Top Up Your Tokens</h1>
          <p className="text-muted-foreground mt-3">Pay once. Tokens never expire.</p>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6 mt-12 items-stretch">
          {PLANS.map((p, i) => {
            const featured = i === 1;
            return (
              <FadeIn key={p.name} delay={i * 80}>
                <div className={`relative bg-background rounded p-8 h-full lift ${featured ? "border-2 border-charcoal md:scale-105" : "border border-border"}`}>
                  {featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-terracotta text-primary-foreground label-eyebrow px-3 py-1 rounded">Most Popular</span>}
                  <h3 className="font-display text-2xl">{p.name}</h3>
                  <p className="font-display text-5xl mt-4">{p.tokens}<span className="text-base text-muted-foreground"> tokens</span></p>
                  <p className="text-2xl mt-2">₹{p.price.toLocaleString("en-IN")}</p>
                  <ul className="text-sm text-muted-foreground mt-6 space-y-1.5">
                    <li>· No expiry</li>
                    <li>· All four tools</li>
                    <li>· Priority email support</li>
                  </ul>
                  <button onClick={() => setActive(p)}
                    className={`mt-8 w-full py-2.5 rounded text-sm ${featured ? "bg-charcoal text-primary-foreground" : "border border-charcoal text-charcoal"}`}>
                    Buy Tokens
                  </button>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
      {active && <PaymentModal plan={active} onClose={() => setActive(null)} />}
    </section>
  );
}
