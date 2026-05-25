import { useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { createPaymentOrder, verifyPaymentAndCreditWallet } from "@/lib/payments.server";

export type Plan = { name: string; tokens: number; price: number };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      on: (event: string, callback: (payload: unknown) => void) => void;
      open: () => void;
    };
  }
}

async function loadRazorpayScript() {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  return await new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { user, session, refreshProfile } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const createOrderFn = useServerFn(createPaymentOrder);
  const verifyPaymentFn = useServerFn(verifyPaymentAndCreditWallet);

  const startPayment = async () => {
    if (!user || !session) {
      toast.error("Please sign in to add money to your wallet");
      return;
    }

    setVerifying(true);

    try {
      const orderData = await createOrderFn({
        data: {
          planName: plan.name,
          accessToken: session.access_token,
        },
      });

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay Checkout");
      }

      const gateway = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        order_id: orderData.order.id,
        name: "ArchConvert",
        description: `Add ₹${plan.tokens} wallet balance`,
        prefill: {
          name: user.user_metadata?.full_name || user.email || "Customer",
          email: user.email || "",
        },
        theme: { color: "#1C1C1C" },
        handler: async (response: any) => {
          await verifyPaymentFn({
            data: {
              accessToken: session.access_token,
              planName: plan.name,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });

          await refreshProfile();
          toast.success(`Wallet credited with ₹${plan.tokens}`);
          onClose();
          setVerifying(false);
        },
      });

      gateway.on("payment.failed", (payload: any) => {
        setVerifying(false);
        toast.error(payload?.error?.description || "Payment failed");
      });

      gateway.open();
    } catch (error) {
      setVerifying(false);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-md rounded-md border border-border p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="label-eyebrow text-terracotta">Secure Checkout</p>
            <h2 className="font-display text-2xl mt-1">{plan.name} — ₹{plan.tokens} Balance</h2>
            <p className="text-sm text-muted-foreground mt-1">Pay: ₹{plan.price.toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="bg-beige p-5 rounded border border-border/70">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-olive mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium">Razorpay hosted checkout</p>
              <p className="text-xs text-muted-foreground mt-1">Card, UPI, netbanking, and wallet payments are handled by Razorpay. No QR code is used.</p>
            </div>
          </div>
        </div>

        <button
          onClick={startPayment}
          disabled={verifying}
          className="mt-6 w-full bg-charcoal text-primary-foreground py-3 rounded text-sm flex items-center justify-center gap-2">
          {verifying ? <><Loader2 className="animate-spin" size={16} /> Opening secure checkout…</> : "Pay Securely"}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-3">Your wallet is credited only after successful payment verification.</p>
      </div>
    </div>
  );
}
