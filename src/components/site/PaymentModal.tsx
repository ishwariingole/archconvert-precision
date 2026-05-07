import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export type Plan = { name: string; tokens: number; price: number };

export function PaymentModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [verifying, setVerifying] = useState(false);
  const upi = `upi://pay?pa=archconvert@upi&pn=ArchConvert&am=${plan.price}&cu=INR`;
  const id = "archconvert@upi";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-md rounded-md border border-border p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="label-eyebrow text-terracotta">Order Summary</p>
            <h2 className="font-display text-2xl mt-1">{plan.name} — {plan.tokens} Tokens</h2>
            <p className="text-sm text-muted-foreground mt-1">Amount: ₹{plan.price.toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="bg-beige p-6 rounded flex items-center justify-center">
          <QRCodeSVG value={upi} size={200} bgColor="#F5F0E8" fgColor="#1C1C1C" />
        </div>

        <div className="mt-4 flex items-center gap-2 border border-border rounded p-2">
          <span className="text-sm flex-1 px-2">{id}</span>
          <button onClick={() => { navigator.clipboard.writeText(id); toast.success("UPI ID copied"); }}
            className="p-2 hover:bg-beige rounded"><Copy size={16} /></button>
        </div>

        <div className="flex gap-3 justify-center mt-4 text-xs text-muted-foreground">
          <span>PhonePe</span>·<span>GPay</span>·<span>Paytm</span>·<span>BHIM</span>
        </div>

        <button
          onClick={() => { setVerifying(true); setTimeout(() => { setVerifying(false); toast.success("Payment received. Tokens credited within 5 min."); onClose(); }, 2200); }}
          disabled={verifying}
          className="mt-6 w-full bg-charcoal text-primary-foreground py-3 rounded text-sm flex items-center justify-center gap-2">
          {verifying ? <><Loader2 className="animate-spin" size={16} /> Verifying payment…</> : "I Have Paid"}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-3">Need help? <a href="mailto:contact@archconvert.in" className="text-terracotta">contact@archconvert.in</a></p>
      </div>
    </div>
  );
}
