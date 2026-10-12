import { z } from "zod";
import { getAddress, isAddress } from "viem";
import { parseChainKey, type ChainKey } from "./chains";

export const addressSchema = z
  .string()
  .trim()
  .refine((s) => isAddress(s, { strict: false }), { message: "Invalid EVM address" })
  .transform((s) => {
    try {
      return getAddress(s);
    } catch {
      return s.toLowerCase();
    }
  });

export const chainSchema = z
  .string()
  .trim()
  .refine((s) => parseChainKey(s) !== null, { message: "Unsupported network. Use robinhood or bsc." })
  .transform((s) => parseChainKey(s) as ChainKey);

export const analyzeRequestSchema = z.object({
  chain: chainSchema,
  address: addressSchema,
  refresh: z.boolean().optional().default(false),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export function normalizeAddress(input: string): string | null {
  const s = input.trim();
  if (!isAddress(s, { strict: false })) return null;
  try {
    return getAddress(s);
  } catch {
    return null;
  }
}

export function isProbablyEOA(code: string | null | undefined): boolean {
  if (!code) return true;
  const c = code.toLowerCase();
  return c === "0x" || c === "0x0" || c === "";
}

export const compareRequestSchema = z.object({
  a: z.object({ chain: chainSchema, address: addressSchema }),
  b: z.object({ chain: chainSchema, address: addressSchema }),
});

export const explainRequestSchema = z.object({
  chain: chainSchema,
  address: addressSchema,
  question: z.string().trim().max(2000).optional(),
});
