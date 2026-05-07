import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-beige border-t border-border mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <Logo />
          <p className="text-sm text-muted-foreground mt-2">Precision tools for architecture professionals.</p>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm">
          <Link to="/tools">Tools</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/dashboard">Dashboard</Link>
          <a href="mailto:contact@archconvert.in">Contact</a>
          <a href="#">Privacy</a>
        </nav>
      </div>
      <div className="border-t border-border text-center text-xs text-muted-foreground py-4">
        © 2025 ArchConvert. All rights reserved.
      </div>
    </footer>
  );
}
