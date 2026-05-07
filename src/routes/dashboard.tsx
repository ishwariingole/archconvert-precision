import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

type Conv = { id: string; tool: string; file_name: string; tokens_used: number; status: string; created_at: string };

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — ArchConvert" }] }),
});

function Dashboard() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversions").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setConvs((data as Conv[]) ?? []));
  }, [user]);

  if (!user) return null;

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="label-eyebrow text-terracotta">Dashboard</p>
        <h1 className="font-display text-5xl mt-3">Welcome back</h1>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <div className="bg-beige rounded p-8 md:col-span-2">
            <p className="label-eyebrow text-muted-foreground">Token Balance</p>
            <p className="font-display text-[64px] leading-none mt-3">{profile?.tokens ?? 0}</p>
            <Link to="/pricing" className="mt-6 inline-block bg-terracotta text-primary-foreground px-5 py-2.5 rounded text-sm">Buy More Tokens</Link>
          </div>
          <div className="bg-card border border-border rounded p-6">
            <p className="label-eyebrow text-muted-foreground">Profile</p>
            <p className="font-medium mt-2">{profile?.full_name || "—"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <p className="text-xs text-muted-foreground mt-4">Member since {profile && new Date((profile as any).created_at ?? Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <h2 className="font-display text-3xl mt-16">Conversion History</h2>
        <div className="mt-6 border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-charcoal text-primary-foreground">
              <tr>
                {["Date", "Tool", "File", "Tokens", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-normal label-eyebrow">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {convs.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-10">No conversions yet — head to <Link to="/tools" className="text-terracotta">Tools</Link>.</td></tr>
              )}
              {convs.map((c, i) => (
                <tr key={c.id} className={i % 2 ? "bg-beige" : "bg-background"}>
                  <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{c.tool}</td>
                  <td className="px-4 py-3">{c.file_name}</td>
                  <td className="px-4 py-3">{c.tokens_used}</td>
                  <td className="px-4 py-3"><span className="text-olive">● {c.status}</span></td>
                  <td className="px-4 py-3"><a href="#" className="text-terracotta">Download</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
