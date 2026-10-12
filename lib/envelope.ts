import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INVALID_ADDRESS"
  | "UNSUPPORTED_CHAIN"
  | "NO_CONTRACT_CODE"
  | "RPC_ERROR"
  | "RPC_TIMEOUT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "ANALYSIS_FAILED"
  | "LLM_UNAVAILABLE"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: { code: ApiErrorCode; message: string; details?: unknown } | null;
  meta: { requestId: string; tookMs: number; cached?: boolean; engineVersion: string };
}

export const ENGINE_VERSION = "opveil-engine/1.0.0";

export function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function ok<T>(data: T, opts?: { cached?: boolean; tookMs?: number; requestId?: string }) {
  const body: ApiEnvelope<T> = {
    ok: true,
    data,
    error: null,
    meta: {
      requestId: opts?.requestId ?? rid(),
      tookMs: opts?.tookMs ?? 0,
      cached: opts?.cached,
      engineVersion: ENGINE_VERSION,
    },
  };
  return NextResponse.json(body);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
  opts?: { tookMs?: number; requestId?: string },
) {
  const body: ApiEnvelope<null> = {
    ok: false,
    data: null,
    error: { code, message, details },
    meta: { requestId: opts?.requestId ?? rid(), tookMs: opts?.tookMs ?? 0, engineVersion: ENGINE_VERSION },
  };
  return NextResponse.json(body, { status });
}

export function zodToCode(issues: { message: string }[]): { code: ApiErrorCode; message: string } {
  const msg = issues.map((i) => i.message).join("; ");
  if (/address/i.test(msg)) return { code: "INVALID_ADDRESS", message: msg };
  if (/network|chain/i.test(msg)) return { code: "UNSUPPORTED_CHAIN", message: msg };
  return { code: "BAD_REQUEST", message: msg };
}
