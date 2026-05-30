// ═══════════════════════════════════════════════════════════
//  Cell Coding — Immune backoff scheduling
//  Virtual delay(ms) before retry attempts.
//  retry 시도 전 가상 지연(ms) 계산.
// ═══════════════════════════════════════════════════════════

import type { ImmunePolicyDecl } from './ast.js';

/** Base unit for virtual backoff ms · 가상 backoff 기본 단위(ms) */
export const BACKOFF_BASE_MS = 100;

/** Compute wait duration before retry attempt N (1-based). */
/** retry N(1부터) 전 대기 시간(ms)을 계산한다. */
export function computeBackoffMs(
  backoff: ImmunePolicyDecl['backoff'] | undefined,
  attemptNumber: number,
  baseMs = BACKOFF_BASE_MS,
): number {
  if (!backoff || attemptNumber < 1) return 0;
  switch (backoff) {
    case 'linear':
      return baseMs * attemptNumber;
    case 'exponential':
      return baseMs * 2 ** (attemptNumber - 1);
    default:
      return 0;
  }
}
