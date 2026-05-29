import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { getSupabaseEnv } from "./integrations/supabase/env";
import { supabaseAdmin } from "./integrations/supabase/client.server";
import type { Database } from "./integrations/supabase/types";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

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

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function textResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-razorpay-signature",
    // Expose these headers to the browser so client-side code can read them if needed
    "access-control-expose-headers": "x-rtb-fingerprint-id, request-id, x-razorpay-signature",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function corsResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders();
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsJsonResponse(data: unknown, status = 200): Response {
  return corsResponse(jsonResponse(data, status));
}

function corsTextResponse(message: string, status = 400): Response {
  return corsResponse(textResponse(message, status));
}

function readEnvValue(env: unknown, key: string): string | undefined {
  if (env && typeof env === "object" && key in env) {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  const processValue = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return processValue && processValue.length > 0 ? processValue : undefined;
}

function getRazorpayConfig(env: unknown) {
  const keyId = readEnvValue(env, "RAZORPAY_KEY_ID");
  const keySecret = readEnvValue(env, "RAZORPAY_KEY_SECRET");
  const webhookSecret = readEnvValue(env, "RAZORPAY_WEBHOOK_SECRET") ?? keySecret;

  if (!keyId || !keySecret || !webhookSecret) {
    throw new Error("Missing Razorpay env vars: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
  }

  return { keyId, keySecret, webhookSecret };
}

async function readJsonBody(request: Request): Promise<any> {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}

async function authenticateRequest(request: Request, env: unknown) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { userId: data.claims.sub, sessionToken: token, supabase };
}

async function createRazorpayOrder(request: Request, env: unknown): Promise<Response> {
  const { userId } = await authenticateRequest(request, env);
  const body = await readJsonBody(request);
  const planKey = String(body.planName ?? body.planKey ?? "").trim().toLowerCase();
  const plan = PAYMENT_PLANS[planKey];
  if (!plan) return textResponse("Invalid top-up plan", 400);

  const { keyId, keySecret } = getRazorpayConfig(env);
  const receipt = `wallet_${userId}_${Date.now()}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: plan.priceInr * 100,
      currency: "INR",
      receipt,
      notes: {
        user_id: userId,
        plan_key: planKey,
        wallet_credits: plan.credits,
        plan_name: plan.name,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return textResponse(data?.error?.description ?? "Failed to create payment order", 500);
  }

  return jsonResponse({
    key_id: keyId,
    order: data,
    plan,
  });
}

async function creditWalletFromPayment(payload: any, env: unknown): Promise<Response> {
  const entity = payload?.payload?.payment?.entity;
  const notes = entity?.notes ?? {};
  const userId = String(notes.user_id ?? "").trim();
  const planKey = String(notes.plan_key ?? "").trim().toLowerCase();
  const plan = PAYMENT_PLANS[planKey];
  const amount = Number(notes.wallet_credits ?? plan?.credits ?? 0);
  const paymentId = String(entity?.id ?? "").trim();

  if (!userId || !plan || !paymentId || amount <= 0) {
    return textResponse("Invalid payment payload", 400);
  }

  await (supabaseAdmin as any).rpc("credit_wallet_after_payment", {
    p_user_id: userId,
    p_amount: amount,
    p_reference: paymentId,
    p_meta: {
      provider: "razorpay",
      plan_key: planKey,
      order_id: entity?.order_id ?? null,
      payment_id: paymentId,
      status: entity?.status ?? null,
      email: entity?.email ?? null,
    },
  });

  return jsonResponse({ ok: true });
}

async function verifyRazorpayPayment(request: Request, env: unknown): Promise<Response> {
  const { keySecret } = getRazorpayConfig(env);
  const { userId } = await authenticateRequest(request, env);
  const body = await readJsonBody(request);
  const planKey = String(body.planName ?? body.planKey ?? "").trim().toLowerCase();
  const plan = PAYMENT_PLANS[planKey];
  const orderId = String(body.razorpay_order_id ?? "").trim();
  const paymentId = String(body.razorpay_payment_id ?? "").trim();
  const signature = String(body.razorpay_signature ?? "").trim();

  if (!plan || !orderId || !paymentId || !signature) {
    return textResponse("Missing payment verification fields", 400);
  }

  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    return textResponse("Invalid payment signature", 400);
  }

  const { error } = await (supabaseAdmin as any).rpc("credit_wallet_after_payment", {
    p_user_id: userId,
    p_amount: plan.credits,
    p_reference: paymentId,
    p_meta: {
      provider: "razorpay",
      plan_key: planKey,
      order_id: orderId,
      payment_id: paymentId,
      signature,
    },
  });

  if (error) {
    return textResponse(error.message, 500);
  }

  return jsonResponse({ ok: true, credits: plan.credits });
}

async function handleWebhook(request: Request, env: unknown): Promise<Response> {
  const { webhookSecret } = getRazorpayConfig(env);
  const signatureHeader = request.headers.get("x-razorpay-signature") ?? "";
  const rawBody = await request.text();

  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signatureHeader) {
    return textResponse("Invalid webhook signature", 401);
  }

  const payload = JSON.parse(rawBody);
  const event = String(payload?.event ?? "");
  if (event !== "payment.captured" && event !== "order.paid") {
    return jsonResponse({ ok: true, ignored: true });
  }

  return await creditWalletFromPayment(payload, env);
}

async function handlePaymentRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/payments/")) return null;

  if (request.method === "OPTIONS") {
    return corsResponse(new Response(null, { status: 204 }));
  }

  if (request.method === "POST" && url.pathname === "/api/payments/create-order") {
    return corsResponse(await createRazorpayOrder(request, env));
  }

  if (request.method === "POST" && url.pathname === "/api/payments/verify") {
    return corsResponse(await verifyRazorpayPayment(request, env));
  }

  if (request.method === "POST" && url.pathname === "/api/payments/webhook") {
    return corsResponse(await handleWebhook(request, env));
  }

  return corsTextResponse("Not found", 404);
}

// --- Simple conversion job runner (upload → status → download) ---
type Job = {
  id: string;
  status: "queued" | "running" | "done" | "error";
  step: number;
  stepsTotal: number;
  message?: string | null;
  uploadedPath?: string | null;
  resultPath?: string | null;
};

const JOBS = new Map<string, Job>();
const TMP_DIR = path.resolve(process.cwd(), "tmp_jobs");

async function ensureTmp() {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function startJobProcessing(job: Job) {
  job.status = "running";
  job.step = 1;
  JOBS.set(job.id, job);

  // Simulate steps with delays. Replace these with real processing pipelines.
  try {
    // Step 1: DWG -> DXF (simulated)
    await new Promise((r) => setTimeout(r, 1200));
    job.step = 2; JOBS.set(job.id, job);

    // Step 2: Apply greyscale mapping (simulated)
    await new Promise((r) => setTimeout(r, 1600));
    job.step = 3; JOBS.set(job.id, job);

    // Step 3: DXF -> DWG (simulated)
    await new Promise((r) => setTimeout(r, 1200));
    job.step = 4; JOBS.set(job.id, job);

    // Create a result file by copying the uploaded file for now
    const uploaded = job.uploadedPath;
    const resultPath = uploaded ? uploaded.replace(/\.dwg$/i, `-greyscale.dwg`) : path.join(TMP_DIR, `${job.id}-result.dwg`);
    if (uploaded) {
      await fs.copyFile(uploaded, resultPath);
    } else {
      // create an empty placeholder
      await fs.writeFile(resultPath, "", "utf8");
    }
    job.resultPath = resultPath;

    job.status = "done";
    job.message = null;
    JOBS.set(job.id, job);
  } catch (err: any) {
    job.status = "error";
    job.message = String(err?.message ?? err ?? "Processing failed");
    JOBS.set(job.id, job);
  }
}

async function handleConversionRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS" && (url.pathname === "/upload" || url.pathname.startsWith("/status/") || url.pathname.startsWith("/download/"))) {
    return corsResponse(new Response(null, { status: 204 }));
  }

  if (request.method === "POST" && url.pathname === "/upload") {
    await ensureTmp();
    // parse multipart form-data using Request.formData()
    try {
      const form = await request.formData();
      const file = form.get("file") as any;
      if (!file || typeof file.arrayBuffer !== "function") {
        return corsTextResponse("No file uploaded", 400);
      }

      const jobId = randomUUID();
      const uploadedPath = path.join(TMP_DIR, `${jobId}-uploaded.dwg`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(uploadedPath, buffer);

      const job: Job = { id: jobId, status: "queued", step: 0, stepsTotal: 4, message: null, uploadedPath, resultPath: null };
      JOBS.set(jobId, job);

      // Start processing asynchronously
      startJobProcessing(job);

      return corsJsonResponse({ job_id: jobId });
    } catch (err: any) {
      return corsTextResponse(String(err?.message ?? err ?? "Upload failed"), 500);
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/status/")) {
    const jobId = url.pathname.split("/status/")[1];
    if (!jobId) return corsTextResponse("Missing job id", 400);
    const job = JOBS.get(jobId);
    if (!job) return corsTextResponse("Job not found", 404);
    return corsJsonResponse({ status: job.status, step: job.step, stepsTotal: job.stepsTotal, message: job.message });
  }

  if (request.method === "GET" && url.pathname.startsWith("/download/")) {
    const jobId = url.pathname.split("/download/")[1];
    if (!jobId) return corsTextResponse("Missing job id", 400);
    const job = JOBS.get(jobId);
    if (!job) return corsTextResponse("Job not found", 404);
    if (job.status !== "done" || !job.resultPath) return corsTextResponse("Result not available", 404);

    try {
      const data = await fs.readFile(job.resultPath);
      const headers = new Headers();
      headers.set("content-type", "application/octet-stream");
      headers.set("content-disposition", `attachment; filename="${path.basename(job.resultPath)}"`);
      return corsResponse(new Response(data, { status: 200, headers }));
    } catch (err: any) {
      return corsTextResponse(String(err?.message ?? err ?? "Could not read result"), 500);
    }
  }

  return null;
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const paymentResponse = await handlePaymentRequest(request, env);
      if (paymentResponse) return paymentResponse;

      // ✅ ADD THIS — was completely missing
      const conversionResponse = await handleConversionRequest(request, env);
      if (conversionResponse) return conversionResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};