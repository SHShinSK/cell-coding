import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { extractProgramGraph, buildFlowSteps, buildViewerScenario } from './signal-graph.js';
import { generateViewerTraces } from './viewer-traces.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sponge = readFileSync(join(__dirname, '../examples/porifera-filter/sponge-organism.cell'), 'utf-8');

describe('signal graph', () => {
  it('extracts sponge cells, tissue flow, and immune policy', () => {
    const { program } = compile(sponge);
    const graph = extractProgramGraph(program);
    assert.equal(graph.cells.length, 3);
    assert.deepEqual(graph.cells.map(c => c.name), [
      'InflowSenseCell',
      'FilterDecideCell',
      'OutflowActCell',
    ]);
    assert.deepEqual(graph.tissueFlow[0], [
      'InflowSenseCell',
      'FilterDecideCell',
      'OutflowActCell',
    ]);
    assert.equal(graph.immune.length, 1);
    assert.equal(graph.immune[0]?.strategy, 'retry');
  });

  it('maps WaterSample consumers on external inject step', () => {
    const { program } = compile(sponge);
    const graph = extractProgramGraph(program);
    const rt = new CellRuntime(program);
    const trace = rt.send('WaterSample', { turbidity: 0.2, flowRate: 10 });
    const steps = buildFlowSteps(trace, graph);
    const first = steps[0];
    assert.equal(first?.from, 'external');
    assert.equal(first?.signal.type, 'WaterSample');
    assert.deepEqual(first?.consumers, ['InflowSenseCell']);
  });

  it('builds viewer scenario bundle with trace and steps', () => {
    const { program } = compile(sponge);
    const rt = new CellRuntime(program);
    const trace = rt.send('WaterSample', { turbidity: 0.95, flowRate: 10 });
    const bundle = buildViewerScenario(
      'porifera-fault',
      'Fault',
      'Fault KO',
      'examples/porifera-filter/sponge-organism.cell',
      program,
      trace,
      { type: 'WaterSample', data: { turbidity: 0.95, flowRate: 10 } },
      rt.getLifecycleSnapshot(),
    );
    assert.equal(bundle.steps.length, trace.length);
    assert.ok(bundle.steps.some(s => s.fromKind === 'immune'));
    assert.ok(bundle.inspect);
    assert.equal(bundle.inspect.organism?.name, 'SpongeOrganism');
    assert.equal(bundle.inspect.ok, true);
  });

  it('generates reference viewer scenarios with inspect', () => {
    const payload = generateViewerTraces();
    assert.equal(payload.scenarios.length, 7);
    assert.ok(payload.scenarios.every(s => s.inspect?.ok !== undefined));
    assert.ok(payload.scenarios.some(s => s.id === 'porifera-clean'));
    assert.ok(payload.scenarios.some(s => s.id === 'spider-stance'));
    assert.ok(payload.scenarios.some(s => s.id === 'spider-sim-sla-stale'));
    const stale = payload.scenarios.find(s => s.id === 'spider-sim-sla-stale');
    assert.ok(stale?.trace.some(t => t.from.startsWith('sla:')));
  });
});
