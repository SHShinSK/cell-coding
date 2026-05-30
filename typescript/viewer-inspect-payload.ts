import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { compile } from './compile.js';
import { extractProgramGraph, buildFlowSteps, type ViewerScenarioBundle } from './signal-graph.js';
import { buildViewerInspectSnapshot } from './viewer-inspect.js';
import type { LiveRunPayload } from './run-payload.js';

export interface BuildInspectViewerOptions {
  file: string;
}

/** Inspect-only viewer payload (no runtime trace) · inspect 전용 viewer 페이로드 */
export function buildInspectViewerPayload(opts: BuildInspectViewerOptions): LiveRunPayload {
  const file = resolve(opts.file);
  const source = readFileSync(file, 'utf-8');
  const { program, diagnostics } = compile(source);
  const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  const graph = extractProgramGraph(program);
  const inspect = buildViewerInspectSnapshot(program, diagnostics);
  const id = basename(file, '.cell').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const rel = file.replace(/\\/g, '/');

  const scenario: ViewerScenarioBundle = {
    id,
    title: `${basename(file)} (inspect)`,
    titleKo: `${basename(file)} (inspect)`,
    file: rel.includes('/examples/') ? rel.slice(rel.indexOf('examples/')) : rel,
    input: { type: '(inspect)', data: {} },
    graph,
    trace: [],
    steps: buildFlowSteps([], graph),
    lifecycle: { states: {}, transitions: [] },
    inspect,
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    live: true,
    result: {
      ok: errors.length === 0,
      file,
      errors,
      trace: [],
      lifecycle: { states: {}, transitions: [] },
      bundle: scenario,
    },
    scenarios: [scenario],
  };
}
