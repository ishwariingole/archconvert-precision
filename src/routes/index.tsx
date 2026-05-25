import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-plan.jpg";
import { FadeIn } from "@/components/site/FadeIn";
import { ToolsGrid } from "@/components/site/ToolsGrid";
import { Gift, Zap, Infinity as InfIcon, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ArchConvert — Convert Architectural Drawings With Precision" },
      { name: "description", content: "Greyscale, hatch removal, and 5-layer CAD structuring for DWG, PDF, and PNG drawings." },
      { property: "og:title", content: "ArchConvert" },
      { property: "og:description", content: "Precision drawing conversion for architecture professionals." },
    ],
  }),
});

function Index() {
  return (
    <>
      {/* HERO */}
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
        <img src={heroImg} alt="Architectural site plan" className="absolute inset-0 w-full h-full object-cover animate-slow-pan" />
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center px-10 py-12 md:px-14 md:py-14"
               style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 4 }}>
            <p className="label-eyebrow text-terracotta">Architectural Tools</p>
            <h1 className="font-display text-[44px] md:text-[52px] leading-[1.05] mt-4 text-charcoal">
              Convert Drawings With Precision
            </h1>
            <p className="text-base text-muted-foreground mt-4">
              Grey scaling, hatch removal, and layer structuring — purpose-built for architects.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link to="/tools" className="bg-charcoal text-primary-foreground px-6 py-3 text-sm rounded">Start Converting</Link>
              <Link to="/pricing" className="border border-charcoal text-charcoal px-6 py-3 text-sm rounded">View Pricing</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-6">No installation required · DWG, PDF, PNG supported · Secure processing</p>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="bg-beige border-y border-border py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap gap-16 text-sm">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-16 px-8">
              <span>2,400+ Files Converted</span><span>·</span>
              <span>340+ Architects</span><span>·</span>
              <span>₹50 Conversion Credit Per File</span><span>·</span>
              <span>Trusted by Studios Across India</span><span>·</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-beige py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="label-eyebrow text-terracotta text-center">Process</p>
            <h2 className="font-display text-4xl md:text-5xl text-center mt-3">Three Steps to a Clean Drawing</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-10 mt-16 relative">
            {[
              { n: "01", t: "Upload", d: "Drag & drop your file or an entire folder." },
              { n: "02", t: "Select Tool", d: "Choose your conversion pipeline." },
              { n: "03", t: "Download", d: "Receive your processed file instantly." },
            ].map((s, i) => (
              <FadeIn key={s.n} delay={i * 120}>
                <div className="text-center">
                  <span className="label-eyebrow text-muted-foreground">{s.n}</span>
                  <h3 className="font-display text-2xl mt-2">{s.t}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{s.d}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="label-eyebrow text-terracotta">Tools</p>
            <h2 className="font-display text-4xl md:text-5xl mt-3 max-w-2xl">Choose Your Conversion Pipeline</h2>
          </FadeIn>
          <div className="mt-12"><ToolsGrid /></div>
        </div>
      </section>

      {/* TOKENS */}
      <section className="bg-beige py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="label-eyebrow text-terracotta">Wallet</p>
            <h2 className="font-display text-4xl md:text-5xl mt-3">How Wallet Credit Works</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            {[
              { Icon: Gift, t: "Top up before using tools" },
              { Icon: Zap, t: "₹50 deducted per conversion" },
              { Icon: InfIcon, t: "Wallet balance never expires" },
              { Icon: BarChart3, t: "Full usage history in dashboard" },
            ].map(({ Icon, t }, i) => (
              <FadeIn key={t} delay={i * 80}>
                <div className="bg-background border border-border rounded p-6 lift h-full">
                  <Icon className="text-terracotta mb-3" strokeWidth={1.3} />
                  <p className="text-sm">{t}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn>
            <div className="mt-10 bg-background border border-border rounded p-8 max-w-md">
              <p className="label-eyebrow text-muted-foreground">Wallet Balance</p>
              <p className="font-display text-6xl mt-2">120</p>
              <p className="text-sm text-muted-foreground">₹ available</p>
              <div className="flex items-end gap-1.5 mt-6 h-16">
                {[40, 25, 60, 35, 80, 50, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-terracotta/80 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last 7 days usage</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <Pricing />
    </>
  );
}

import { PaymentModal, type Plan } from "@/components/site/PaymentModal";
import { useState } from "react";

const PLANS: Plan[] = [
  { name: "Starter", tokens: 50, price: 199 },
  { name: "Professional", tokens: 150, price: 499 },
  { name: "Studio", tokens: 500, price: 1299 },
];

function Pricing() {
  const [active, setActive] = useState<Plan | null>(null);
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="label-eyebrow text-terracotta">Pricing</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3">Top Up Your Tokens</h2>
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
                    <li>· All tools included</li>
                    <li>· Email support</li>
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
