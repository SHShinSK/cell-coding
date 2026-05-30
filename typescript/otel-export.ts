// ═══════════════════════════════════════════════════════════
//  Cell Coding — OpenTelemetry trace export (Phase 4 PoC)
//  runtime trace → OTel JSON spans
// ═══════════════════════════════════════════════════════════

import type { TraceEntry } from './runtime.js';

export interface OtelSpan {
  traceId: string;
  spanId: string;
  name: string;
  kind: 'INTERNAL' | 'SERVER' | 'CLIENT';
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: number } }>;
  status?: { code: 'OK' | 'ERROR' };
}

export interface OtelTracePayload {
  resourceSpans: Array<{
    resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
    scopeSpans: Array<{
      scope: { name: string; version: string };
      spans: OtelSpan[];
    }>;
  }>;
}

function padHex(n: number, len: number): string {
  return n.toString(16).padStart(len, '0');
}

function spanId(seed: number): string {
  return padHex(seed, 16);
}

/** Convert Cell runtime trace to OTel JSON (PoC, no SDK). */
/** Cell runtime trace를 OTel JSON으로 변환 (PoC) */
export function traceToOtelPayload(
  trace: TraceEntry[],
  opts: { serviceName?: string; traceId?: string } = {},
): OtelTracePayload {
  const serviceName = opts.serviceName ?? 'cell-runtime';
  const traceId = opts.traceId ?? padHex(0xdecafbad, 32);
  const baseMs = trace[0]?.atMs ?? 0;

  const spans: OtelSpan[] = trace.map((entry, i) => {
    const startMs = entry.atMs ?? i;
    const endMs = startMs + (entry.backoffMs ?? 1);
    const attrs: OtelSpan['attributes'] = [
      { key: 'cell.signal.type', value: { stringValue: entry.signal.type } },
      { key: 'cell.signal.from', value: { stringValue: entry.from } },
    ];
    if (Object.keys(entry.signal.data).length) {
      attrs.push({
        key: 'cell.signal.data',
        value: { stringValue: JSON.stringify(entry.signal.data) },
      });
    }
    if (entry.backoffMs) {
      attrs.push({ key: 'cell.backoff.ms', value: { intValue: entry.backoffMs } });
    }

    const isError =
      entry.from.startsWith('immune:') &&
      (entry.signal.type.includes('Fault') || entry.from.includes('#deadLetter'));

    return {
      traceId,
      spanId: spanId(i + 1),
      name: `${entry.from} → ${entry.signal.type}`,
      kind: entry.from === 'external' ? 'SERVER' : 'INTERNAL',
      startTimeUnixNano: String((baseMs + startMs) * 1_000_000),
      endTimeUnixNano: String((baseMs + endMs) * 1_000_000),
      attributes: attrs,
      status: isError ? { code: 'ERROR' } : { code: 'OK' },
    };
  });

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
        },
        scopeSpans: [
          {
            scope: { name: 'cell-coding-runtime', version: '0.1.0' },
            spans,
          },
        ],
      },
    ],
  };
}

export function shouldExportOtel(): boolean {
  const v = process.env.CELL_OTEL?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** OTLP HTTP Collector로 push · CELL_OTEL_EXPORT=otlp */
export function shouldPushOtelToCollector(): boolean {
  const mode = process.env.CELL_OTEL_EXPORT?.toLowerCase();
  return mode === 'otlp' || mode === 'collector' || mode === '1' || mode === 'true';
}

export function otelCollectorEndpoint(): string {
  return (
    process.env.CELL_OTEL_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    'http://127.0.0.1:4318/v1/traces'
  );
}

/** OTLP/HTTP JSON traces export · OpenTelemetry Collector */
export async function pushOtelTraces(
  payload: OtelTracePayload,
  endpoint = otelCollectorEndpoint(),
): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OTLP export failed · OTLP 전송 실패: ${res.status} ${body}`);
  }
}

/** Jaeger UI trace search URL · Viewer 링크용 */
export function jaegerSearchUrl(
  serviceName: string,
  jaegerBase = process.env.JAEGER_UI_URL ?? 'http://127.0.0.1:16686',
): string {
  const base = jaegerBase.replace(/\/$/, '');
  return `${base}/search?service=${encodeURIComponent(serviceName)}`;
}
