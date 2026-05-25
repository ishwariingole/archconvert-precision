import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { getSupabaseEnv } from "@/integrations/supabase/env";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type PaymentPlan = {
  name: string;
  credits: number;
  priceInr: number;
};

const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  starter: { name: "Starter", credits: 100, priceInr: 100 },
  professional: { name: "Professional", credits: 300, priceInr: 300 },
  studio: { name: "Studio", credits: 500, priceInr: 500 },
};

function normalizePlanKey(input: string): string {
  return input.trim().toLowerCase();
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay env vars: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
  }

  return { keyId, keySecret };
}

async function resolveUserIdFromAccessToken(accessToken: string): Promise<string> {
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(accessToken);
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized");
  }

  return data.claims.sub;
}

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { planName: string; accessToken: string }) => d)
  .handler(async ({ data }) => {
    const planKey = normalizePlanKey(data.planName);
    const plan = PAYMENT_PLANS[planKey];
    if (!plan) {
      throw new Error("Invalid top-up plan");
    }

    const userId = await resolveUserIdFromAccessToken(data.accessToken);
    const { keyId, keySecret } = getRazorpayConfig();

    // Razorpay enforces a max length of 40 chars for the `receipt` field.
    // Use a shortened user id slice plus timestamp to keep it under the limit.
    const receiptId = `wallet_${userId.slice(0, 8)}_${Date.now()}`;

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.priceInr * 100,
        currency: "INR",
        receipt: receiptId,
        notes: {
          user_id: userId,
          plan_key: planKey,
          wallet_credits: plan.credits,
          plan_name: plan.name,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.description ?? "Failed to create payment order");
    }

    return {
      key_id: keyId,
      order: result,
      plan,
    };
  });

export const verifyPaymentAndCreditWallet = createServerFn({ method: "POST" })
  .inputValidator((d: {
    accessToken: string;
    planName: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => d)
  .handler(async ({ data }) => {
    const planKey = normalizePlanKey(data.planName);
    const plan = PAYMENT_PLANS[planKey];
    if (!plan) {
      throw new Error("Invalid top-up plan");
    }

    const userId = await resolveUserIdFromAccessToken(data.accessToken);
    const { keySecret } = getRazorpayConfig();

    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");

    if (expected !== data.razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    const { error } = await supabaseAdmin.rpc("credit_wallet_after_payment", {
      p_user_id: userId,
      p_amount: plan.credits,
      p_reference: data.razorpay_payment_id,
      p_meta: {
        provider: "razorpay",
        plan_key: planKey,
        order_id: data.razorpay_order_id,
        payment_id: data.razorpay_payment_id,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true,
      credits: plan.credits,
    };
  });
