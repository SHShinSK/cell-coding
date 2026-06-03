// ═══════════════════════════════════════════════════════════
//  Cell Coding — Stream periodic inject (RFC-0001)
//  stream 선언 해석 + 샘플 배치 확장 · cell run --stream
// ═══════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Program, StreamDecl } from './ast.js';

export interface ResolvedStream {
  decl: StreamDecl;
  sampleType: string;
  intervalMs: number;
}

export interface StreamRunMeta {
  name?: string;
  sampleType: string;
  sampleCount: number;
  intervalMs: number;
  virtualElapsedMs: number;
}

/** Program 내 stream 선언 목록 · stream declarations */
export function listStreamDecls(program: Program): StreamDecl[] {
  return program.statements.filter((s): s is StreamDecl => s.kind === 'StreamDecl');
}

/** stream 이름으로 sample type·기본 interval 해석 · resolve stream decl */
export function resolveStream(
  program: Program,
  streamName?: string,
): ResolvedStream | { error: string } {
  const streams = listStreamDecls(program);
  if (streams.length === 0) {
    return { error: 'No stream declarations in program · stream 선언 없음' };
  }

  let decl: StreamDecl | undefined;
  if (streamName) {
    decl = streams.find(s => s.name === streamName);
    if (!decl) {
      return { error: `Stream '${streamName}' not found · stream '${streamName}' 없음` };
    }
  } else if (streams.length === 1) {
    decl = streams[0];
  } else {
    const names = streams.map(s => s.name).join(', ');
    return { error: `Multiple streams — specify --stream <name> · stream 이름 지정: ${names}` };
  }

  const rateHz = decl.rateHz ?? 0;
  const intervalMs = rateHz > 0 ? Math.max(1, Math.round(1000 / rateHz)) : 50;
  return { decl, sampleType: decl.sampleType, intervalMs };
}

/** 단일 template을 N개 샘플로 확장 (timestamp 가상 증분) · expand samples */
export function expandStreamSamples(
  template: Record<string, unknown>,
  count: number,
  intervalMs: number,
): Record<string, unknown>[] {
  const samples: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const data = { ...template };
    const ts = data.timestamp;
    if (typeof ts === 'number' && Number.isFinite(ts)) {
      data.timestamp = ts + i * intervalMs;
    } else {
      data.timestamp = i * intervalMs;
    }
    samples.push(data);
  }
  return samples;
}

function normalizeSampleItem(item: unknown, index: number): Record<string, unknown> | { error: string } {
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      return obj.data as Record<string, unknown>;
    }
    return obj;
  }
  return { error: `Invalid stream sample at index ${index} · index ${index} 샘플 형식 오류` };
}

/** CLI/bridge JSON → 샘플 배열 · parse stream payload */
export function parseStreamSamplePayload(
  raw: string | undefined,
  template: Record<string, unknown>,
  count: number,
  intervalMs: number,
): Record<string, unknown>[] | { error: string } {
  if (!raw) {
    return expandStreamSamples(template, count, intervalMs);
  }

  const text = raw.startsWith('@')
    ? readFileSync(resolve(process.cwd(), raw.slice(1)), 'utf-8')
    : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'Invalid stream JSON · stream JSON 파싱 실패' };
  }

  if (Array.isArray(parsed)) {
    const samples: Record<string, unknown>[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = normalizeSampleItem(parsed[i], i);
      if ('error' in item) return { error: String((item as { error: string }).error) };
      samples.push(item);
    }
    if (samples.length === 0) {
      return { error: 'Stream sample array is empty · 샘플 배열이 비어 있음' };
    }
    return samples;
  }

  if (parsed && typeof parsed === 'object') {
    return expandStreamSamples(parsed as Record<string, unknown>, count, intervalMs);
  }

  return { error: 'Stream JSON must be object or array · object 또는 array 필요' };
}
