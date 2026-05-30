import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { CellLifecycleManager } from './lifecycle.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(__dirname, p), 'utf-8');

const spongeSource = read('../examples/porifera-filter/sponge-organism.cell');

const isolateSource = `
signal Ping { n: Number }
signal Pong { ok: Boolean }
signal Fault { msg: String }

cell FaultyCell {
  role: "fault emitter · fault 방출";
  membrane { accepts: Ping; emits: Fault | Pong; }
  on(Ping p) {
    if (p.n < 0) { emit Fault; } else { emit Pong; }
  }
  apoptosis { emit Pong(ok: false); }
}

organism IsoOrg {
  immune IsoPolicy {
    on Fault { strategy: isolate; }
  }
}
`;

describe('Cell lifecycle manager', () => {
  it('bootstraps genesis → dormant for each cell', () => {
    const lc = new CellLifecycleManager();
    lc.bootstrap([{ name: 'A' }, { name: 'B' }]);
    const snap = lc.snapshot();
    assert.equal(snap.states.A, 'dormant');
    assert.equal(snap.states.B, 'dormant');
    assert.ok(snap.transitions.some(t => t.from === 'genesis' && t.to === 'dormant'));
  });

  it('runs dormant → active → emitting → active → dormant per handler', () => {
    const lc = new CellLifecycleManager();
    lc.bootstrap([{ name: 'Echo' }]);
    lc.beginHandle('Echo');
    lc.beginEmit('Echo');
    lc.endEmit('Echo');
    lc.endHandle('Echo');
    const phases = lc.snapshot().transitions.map(t => `${t.from}->${t.to}`);
    assert.ok(phases.includes('dormant->active'));
    assert.ok(phases.includes('active->emitting'));
    assert.ok(phases.includes('emitting->active'));
    assert.ok(phases.includes('active->dormant'));
  });

  it('blocks receive after apoptosis', () => {
    const lc = new CellLifecycleManager();
    lc.bootstrap([{ name: 'Dead' }]);
    lc.commitApoptosis('Dead', 'test');
    assert.equal(lc.canReceive('Dead'), false);
    assert.equal(lc.getPhase('Dead'), 'apoptosis');
  });
});

describe('Cell lifecycle runtime', () => {
  function runtimeFor(source: string): CellRuntime {
    const { program, diagnostics } = compile(source);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
    return new CellRuntime(program);
  }

  it('records lifecycle transitions during sponge cascade', () => {
    const rt = runtimeFor(spongeSource);
    rt.send('WaterSample', { turbidity: 0.2, flowRate: 10 });
    const { states, transitions } = rt.getLifecycleSnapshot();
    assert.equal(states.InflowSenseCell, 'dormant');
    assert.equal(states.FilterDecideCell, 'dormant');
    assert.equal(states.OutflowActCell, 'dormant');
    assert.ok(transitions.some(t => t.cell === 'InflowSenseCell' && t.to === 'active'));
    assert.ok(transitions.some(t => t.cell === 'OutflowActCell' && t.to === 'emitting'));
  });

  it('skips handlers after forceApoptosis', () => {
    const rt = runtimeFor(spongeSource);
    rt.forceApoptosis('InflowSenseCell', 'test kill');
    const trace = rt.send('WaterSample', { turbidity: 0.2, flowRate: 10 });
    assert.equal(trace.length, 1);
    assert.equal(trace[0]?.from, 'external');
    assert.equal(rt.getLifecycleSnapshot().states.InflowSenseCell, 'apoptosis');
  });

  it('runs apoptosis hook when immune isolate fires', () => {
    const rt = runtimeFor(isolateSource);
    const trace = rt.send('Ping', { n: -1 });
    assert.ok(trace.some(t => t.from === 'FaultyCell' && t.signal.type === 'Pong'));
    assert.equal(rt.getLifecycleSnapshot().states.FaultyCell, 'apoptosis');
  });
});
