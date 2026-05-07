import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Menu, X, Coins } from "lucide-react";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const links = [
    { to: "/", label: "Home" },
    { to: "/tools", label: "Tools" },
    { to: "/pricing", label: "Pricing" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-foreground"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-foreground hover:text-terracotta transition-colors"
              activeProps={{ className: "text-terracotta" }}>{l.label}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal text-primary-foreground px-3 py-1 text-xs">
                <Coins size={13} /> {profile?.tokens ?? 0} Tokens
              </span>
              <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm">Login</Link>
              <Link to="/signup" className="text-sm bg-charcoal text-primary-foreground px-4 py-2 rounded">Sign Up</Link>
            </>
          )}
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-3">
          {links.map(l => <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>)}
          {user ? (
            <button onClick={async () => { await signOut(); setOpen(false); }}>Sign out</button>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
              <Link to="/signup" onClick={() => setOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
