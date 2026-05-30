// ═══════════════════════════════════════════════════════════
//  Cell Coding — Live run JSON payload (CLI / viewer)
//  cell run JSON 페이로드 (CLI·viewer 공용)
// ═══════════════════════════════════════════════════════════

import { basename } from 'node:path';
import { jaegerSearchUrl } from './otel-export.js';
import type { RunCellResult } from './run-cell.js';

export interface LiveRunObservability {
  /** Jaeger UI search URL · distributed trace */
  jaegerUrl?: string;
  otelService?: string;
}

export interface LiveRunPayload {
  version: number;
  generatedAt: string;
  live: boolean;
  /** Viewer should poll `--out` while CLI watch is active · watch 중 viewer 폴링 */
  watch?: boolean;
  /** Suggested poll interval (ms) · 권장 폴링 간격(ms) */
  pollIntervalMs?: number;
  /** OTel / Jaeger links for viewer · 관측성 링크 */
  observability?: LiveRunObservability;
  result: RunCellResult;
  scenarios: NonNullable<RunCellResult['bundle']>[];
}

export interface BuildLiveRunPayloadOptions {
  watch?: boolean;
  pollIntervalMs?: number;
  jaegerUiUrl?: string;
  otelServiceName?: string;
}

/** Build viewer-ready JSON envelope from a run result. */
/** 실행 결과를 viewer용 JSON 래퍼로 만든다. */
export function buildLiveRunPayload(
  result: RunCellResult,
  opts: BuildLiveRunPayloadOptions = {},
): LiveRunPayload {
  const observability: LiveRunObservability | undefined = opts.jaegerUiUrl
    ? {
        otelService: opts.otelServiceName ?? `cell-${basename(result.file, '.cell')}`,
        jaegerUrl: jaegerSearchUrl(
          opts.otelServiceName ?? `cell-${basename(result.file, '.cell')}`,
          opts.jaegerUiUrl,
        ),
      }
    : undefined;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    live: true,
    watch: opts.watch || undefined,
    pollIntervalMs: opts.pollIntervalMs,
    observability,
    result,
    scenarios: result.bundle ? [result.bundle] : [],
  };
}
