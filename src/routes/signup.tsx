import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import toast from "react-hot-toast";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password: pw,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome! 10 free tokens added to your account.");
    nav({ to: "/dashboard" });
  };

  const onGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <section className="bg-beige min-h-[80vh] flex items-center justify-center px-6 py-20">
      <div className="bg-background border border-border rounded p-10 w-full max-w-md">
        <p className="label-eyebrow text-terracotta">Sign Up</p>
        <h1 className="font-display text-3xl mt-2">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Get 10 free tokens to start.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input required placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background" />
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background" />
          <input type="password" required minLength={6} placeholder="Password" value={pw} onChange={e => setPw(e.target.value)}
            className="w-full border border-border rounded px-3 py-2.5 text-sm bg-background" />
          <button disabled={busy} className="w-full bg-charcoal text-primary-foreground py-2.5 rounded text-sm">{busy ? "Creating…" : "Create account"}</button>
        </form>
        <div className="my-5 text-center text-xs text-muted-foreground">or</div>
        <button onClick={onGoogle} className="w-full border border-charcoal text-charcoal py-2.5 rounded text-sm">Continue with Google</button>
        <p className="text-sm text-muted-foreground mt-6 text-center">Have an account? <Link to="/login" className="text-terracotta">Sign in</Link></p>
      </div>
    </section>
  );
}
