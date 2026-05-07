export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="3" y="3" width="26" height="26" />
        <path d="M3 12h12V3M15 12v17M3 21h12M15 21h14M22 12v17M22 3v9" />
      </svg>
      <span className="font-display text-xl tracking-tight">ArchConvert</span>
    </div>
  );
}
