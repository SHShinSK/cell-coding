// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell run --watch loop
//  .cell 파일 변경 시 live-run.json 재생성
// ═══════════════════════════════════════════════════════════

import { watch, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { runCellFile, runCellFileAsync } from './run-cell.js';
import type { TranspiledRunOptions } from './run-cell.js';
import { buildLiveRunPayload } from './run-payload.js';
import type { SignalInstance } from './runtime.js';

export const WATCH_DEBOUNCE_MS = 300;
export const DEFAULT_WATCH_POLL_MS = 1000;
export const DEFAULT_WATCH_OUT = '../viewer/live-run.json';

export interface CellWatchOptions {
  file: string;
  out: string;
  input: SignalInstance;
  pollIntervalMs?: number;
  debounceMs?: number;
  /** transpiled handler watch · cell run --transpiled --watch */
  transpiled?: TranspiledRunOptions;
  functionsPath?: string;
  jaegerUiUrl?: string;
  onRun?: (info: { ok: boolean; signalCount: number; out: string }) => void;
}

/** Run once and write live JSON to disk. */
/** 1회 실행 후 live JSON을 디스크에 쓴다. */
export async function writeLiveRunOnce(opts: CellWatchOptions): Promise<ReturnType<typeof runCellFile>> {
  const outPath = resolve(process.cwd(), opts.out);
  mkdirSync(dirname(outPath), { recursive: true });

  const file = resolve(process.cwd(), opts.file);
  const result =
    await runCellFileAsync({
      file,
      input: opts.input,
      transpiled: opts.transpiled,
      functionsPath: opts.functionsPath,
      jaegerUiUrl: opts.jaegerUiUrl,
    });

  const payload = buildLiveRunPayload(result, {
    watch: true,
    pollIntervalMs: opts.pollIntervalMs ?? DEFAULT_WATCH_POLL_MS,
    jaegerUiUrl: opts.jaegerUiUrl,
    otelServiceName: `cell-${basename(file, '.cell')}`,
  });

  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  opts.onRun?.({ ok: result.ok, signalCount: result.trace.length, out: outPath });

  return result;
}

/** Watch `.cell` source and rewrite `--out` on each save. */
/** `.cell` 저장 시마다 `--out` JSON을 갱신한다. */
export function startCellWatch(opts: CellWatchOptions): { close: () => void } {
  const filePath = resolve(process.cwd(), opts.file);
  const debounceMs = opts.debounceMs ?? WATCH_DEBOUNCE_MS;
  let debounce: ReturnType<typeof setTimeout> | null = null;

  const runDebounced = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      void writeLiveRunOnce(opts).catch(err => {
        console.error(err instanceof Error ? err.message : String(err));
      });
    }, debounceMs);
  };

  void writeLiveRunOnce(opts).catch(err => {
    console.error(err instanceof Error ? err.message : String(err));
  });

  const watcher = watch(filePath, () => runDebounced());

  return {
    close: () => {
      if (debounce) clearTimeout(debounce);
      watcher.close();
    },
  };
}
