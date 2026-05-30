// ═══════════════════════════════════════════════════════════
//  Cell Coding — Run .cell program (shared by CLI / demo / viewer)
//  .cell 프로그램 실행 (CLI·demo·viewer 공용)
// ═══════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime, type RuntimeOptions } from './runtime.js';
import { createTranspiledRuntime } from './transpiled-runtime.js';
import { loadTranspiledRegistrations } from './transpiled-loader.js';
import { resolveCellFunctions } from './cell-functions.js';
import { buildViewerScenario } from './signal-graph.js';
import type { SignalInstance, TraceEntry } from './runtime.js';
import type { LifecycleSnapshot } from './lifecycle.js';
import type { ViewerScenarioBundle } from './signal-graph.js';
import type { TypeCheckError } from './checker.js';

export interface TranspiledRunOptions {
  /** Pre-built generated dir · cell build --out 경로 */
  generatedDir?: string;
  /** Subset of cells · 특정 세포만 wire-up */
  cellNames?: string[];
}

export interface RunCellOptions {
  /** Absolute or relative path to .cell file · .cell 파일 경로 */
  file: string;
  /** External signal to inject · 주입할 외부 신호 */
  input: SignalInstance;
  /** Viewer scenario id (default: file basename) · 시나리오 id */
  id?: string;
  /** Display title (default: basename) · 표시 제목 */
  title?: string;
  titleKo?: string;
  /** AST interpreter 대신 transpiled TS handler 실행 · cell run --transpiled */
  transpiled?: boolean | TranspiledRunOptions;
  /** CellRuntime 옵션 (functions, activeCells 등) */
  runtime?: RuntimeOptions;
  /** Explicit functions sidecar · cell run --functions */
  functionsPath?: string;
  /** Jaeger UI base URL for viewer link · JAEGER_UI_URL */
  jaegerUiUrl?: string;
}

export interface RunCellResult {
  ok: boolean;
  file: string;
  errors: string[];
  trace: TraceEntry[];
  lifecycle: LifecycleSnapshot;
  bundle?: ViewerScenarioBundle;
}

function scenarioIdFromFile(file: string): string {
  return basename(file, '.cell').replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function compileCellSource(file: string, source: string): {
  ok: true;
  file: string;
  program: ReturnType<typeof compile>['program'];
  diagnostics: TypeCheckError[];
} | RunCellResult {
  let program;
  let diagnostics: TypeCheckError[];
  try {
    ({ program, diagnostics } = compile(source));
  } catch (e) {
    return {
      ok: false,
      file,
      errors: [e instanceof Error ? e.message : String(e)],
      trace: [],
      lifecycle: { states: {}, transitions: [] },
    };
  }

  const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  if (errors.length > 0) {
    return {
      ok: false,
      file,
      errors,
      trace: [],
      lifecycle: { states: {}, transitions: [] },
    };
  }

  return { ok: true, file, program, diagnostics };
}

function finishRun(
  opts: RunCellOptions,
  file: string,
  program: ReturnType<typeof compile>['program'],
  diagnostics: TypeCheckError[],
  runtime: CellRuntime,
): RunCellResult {
  const trace = runtime.send(opts.input.type, opts.input.data);
  const lifecycle = runtime.getLifecycleSnapshot();

  const relFile = file.replace(/\\/g, '/');
  const id = opts.id ?? scenarioIdFromFile(file);
  const title = opts.title ?? basename(file);
  const titleKo = opts.titleKo ?? basename(file);

  const bundle = buildViewerScenario(
    id,
    title,
    titleKo,
    relFile.includes('/examples/') ? relFile.slice(relFile.indexOf('examples/')) : relFile,
    program,
    trace,
    opts.input,
    lifecycle,
    diagnostics,
  );

  return { ok: true, file, errors: [], trace, lifecycle, bundle };
}

function normalizeTranspiledOpts(
  transpiled: boolean | TranspiledRunOptions | undefined,
): TranspiledRunOptions | undefined {
  if (!transpiled) return undefined;
  return transpiled === true ? {} : transpiled;
}

/** Compile, run cascade, and build viewer bundle. */
/** 컴파일 후 연쇄 실행하고 viewer 번들을 만든다. */
export function runCellFile(opts: RunCellOptions): RunCellResult {
  if (opts.transpiled) {
    throw new Error(
      'runCellFile does not support transpiled mode · transpiled는 runCellFileAsync 사용',
    );
  }

  const file = resolve(opts.file);
  let source: string;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (e) {
    return {
      ok: false,
      file,
      errors: [e instanceof Error ? e.message : String(e)],
      trace: [],
      lifecycle: { states: {}, transitions: [] },
    };
  }

  const compiled = compileCellSource(file, source);
  if (!compiled.ok) return compiled;

  const runtime = new CellRuntime(compiled.program, opts.runtime ?? {});
  return finishRun(opts, file, compiled.program, compiled.diagnostics, runtime);
}

/** transpiled handler 포함 비동기 실행 · cell run --transpiled */
export async function runCellFileAsync(opts: RunCellOptions): Promise<RunCellResult> {
  const file = resolve(opts.file);
  let source: string;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (e) {
    return {
      ok: false,
      file,
      errors: [e instanceof Error ? e.message : String(e)],
      trace: [],
      lifecycle: { states: {}, transitions: [] },
    };
  }

  const compiled = compileCellSource(file, source);
  if (!compiled.ok) return compiled;

  const transpiledOpts = normalizeTranspiledOpts(opts.transpiled);
  const runtimeOpts: RuntimeOptions = { ...(opts.runtime ?? {}) };

  const fns = await resolveCellFunctions(file, opts.functionsPath);
  if (Object.keys(fns).length) {
    runtimeOpts.functions = { ...fns, ...(runtimeOpts.functions ?? {}) };
  }

  let runtime: CellRuntime;

  if (transpiledOpts) {
    const registrations = await loadTranspiledRegistrations(file, compiled.program, transpiledOpts);
    runtime = createTranspiledRuntime(compiled.program, registrations, runtimeOpts);
  } else {
    runtime = new CellRuntime(compiled.program, runtimeOpts);
  }

  return finishRun(opts, file, compiled.program, compiled.diagnostics, runtime);
}

/** Human-readable run summary for terminal demo output. */
/** 터미널 demo용 사람이 읽기 쉬운 실행 요약 */
export function formatRunHuman(result: RunCellResult, input: SignalInstance): string {
  const shortFile = result.file.replace(/\\/g, '/').split('/').slice(-2).join('/');
  const lines: string[] = [
    '',
    '  Cell Coding runtime · 신호 런타임',
    `  file   : ${shortFile}`,
    `  inject : ${input.type} ${JSON.stringify(input.data)}`,
    '',
    '  Signal cascade · 신호 연쇄:',
  ];

  for (const entry of result.trace) {
    const arrow = entry.from.startsWith('immune:')
      ? '⚕'
      : entry.from === 'external'
        ? '⇒'
        : '→';
    const payload = Object.keys(entry.signal.data).length
      ? ' ' + JSON.stringify(entry.signal.data)
      : '';
    lines.push(`    ${entry.from.padEnd(28)} ${arrow} ${entry.signal.type}${payload}`);
  }

  lines.push(
    '',
    `  ${result.trace.length} signal(s) · 신호 ${result.trace.length}개`,
    '',
    '  Lifecycle · 생존 주기 (final states):',
  );

  for (const [cell, phase] of Object.entries(result.lifecycle.states)) {
    lines.push(`    ${cell.padEnd(28)} ${phase}`);
  }

  lines.push(
    `  ${result.lifecycle.transitions.length} transition(s) · 전이 ${result.lifecycle.transitions.length}개`,
    '',
  );

  return lines.join('\n');
}
