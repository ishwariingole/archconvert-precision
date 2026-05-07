import { HelpCircle } from "lucide-react";
export function HelpButton() {
  return (
    <a href="mailto:contact@archconvert.in"
      className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-charcoal text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      aria-label="Need help?">
      <HelpCircle size={20} />
    </a>
  );
}
