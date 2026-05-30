import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(__dirname, p), 'utf-8');

const spongeSource = read('../examples/porifera-filter/sponge-organism.cell');
const spiderSource = read('../examples/spider-robot/spider-organism.cell');
const petSource = read('../examples/pet-robot/pet-organism.cell');

function runtimeFor(source: string): CellRuntime {
  const { program, diagnostics } = compile(source);
  assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  return new CellRuntime(program);
}

describe('Cell Coding runtime', () => {
  it('cascades a clean WaterSample through the sponge to ExhalePulse', () => {
    const rt = runtimeFor(spongeSource);
    const trace = rt.send('WaterSample', { turbidity: 0.2, flowRate: 10 });
    const types = trace.map(t => t.signal.type);
    assert.deepEqual(types, ['WaterSample', 'ParticleLoad', 'FilterCommand', 'ExhalePulse']);
  });

  it('routes high turbidity to SensorFault, circuit-limited retries', () => {
    const rt = runtimeFor(spongeSource);
    const trace = rt.send('WaterSample', { turbidity: 0.95, flowRate: 10 });
    const types = trace.map(t => t.signal.type);
    assert.ok(types.includes('SensorFault'));
    const retries = trace.filter(t => t.from.startsWith('immune:SensorPolicy#retry:'));
    assert.equal(retries.length, 2);
    assert.ok(trace.some(t => t.from === 'immune:CircuitBreaker#trip'));
    assert.equal(trace.filter(t => t.signal.type === 'WaterSample').length, 3);
  });

  it('evaluates emit arguments from the decision branch', () => {
    const rt = runtimeFor(spongeSource);
    // ParticleLoad with low density -> FilterCommand(action: "pass")
    const trace = rt.send('ParticleLoad', { density: 0.1, maxSize: 1 });
    const cmd = trace.find(t => t.signal.type === 'FilterCommand');
    assert.ok(cmd);
    assert.equal(cmd.signal.data.action, 'pass');
  });

  it('high density routes to absorb', () => {
    const rt = runtimeFor(spongeSource);
    const trace = rt.send('ParticleLoad', { density: 0.9, maxSize: 1 });
    const cmd = trace.find(t => t.signal.type === 'FilterCommand');
    assert.equal(cmd?.signal.data.action, 'absorb');
  });

  it('records the emitting cell for each signal', () => {
    const rt = runtimeFor(spongeSource);
    const trace = rt.send('WaterSample', { turbidity: 0.2, flowRate: 10 });
    const exhale = trace.find(t => t.signal.type === 'ExhalePulse');
    assert.equal(exhale?.from, 'OutflowActCell');
  });

  it('drives the spider sensing chain to a StanceHold', () => {
    const rt = runtimeFor(spiderSource);
    const trace = rt.send('VisionFrame', { contrast: 0.6, motion: 0.3 });
    const types = trace.map(t => t.signal.type);
    assert.ok(types.includes('ThreatAssessment'));
    assert.ok(types.includes('StanceHold'));
  });

  it('does not invoke immune on successful sponge cascade', () => {
    const rt = runtimeFor(spongeSource);
    const trace = rt.send('WaterSample', { turbidity: 0.2, flowRate: 10 });
    assert.equal(trace.filter(t => t.from.startsWith('immune:')).length, 0);
  });

  it('PET immune fallback emits ComfortAction on DistressSignal', () => {
    const rt = runtimeFor(petSource);
    const trace = rt.send('OwnerPing', { rssi: 0.01 });
    assert.ok(trace.some(t => t.signal.type === 'DistressSignal'));
    const fallback = trace.find(t => t.from === 'immune:SafetyPolicy#fallback');
    assert.ok(fallback);
    assert.equal(fallback.signal.type, 'ComfortAction');
  });

  it('clean PET path does not trigger immune fallback', () => {
    const rt = runtimeFor(petSource);
    const trace = rt.send('OwnerPing', { rssi: 0.8 });
    assert.equal(trace.filter(t => t.from.startsWith('immune:')).length, 0);
    assert.ok(trace.some(t => t.signal.type === 'OwnerPresence'));
  });

  it('trips circuit breaker on sponge fault storm', () => {
    const rt = runtimeFor(spongeSource);
    const trace = rt.send('WaterSample', { turbidity: 0.95, flowRate: 10 });
    assert.ok(trace.some(t => t.from === 'immune:CircuitBreaker#trip'));
    assert.ok(trace.some(t => t.from === 'immune:CircuitBreaker#reject'));
    assert.equal(rt.getCircuitPhase(), 'open');
  });

  it('stores dead letters and escalates when policy requests it', () => {
    const source = read('fixtures/immune-deadletter.cell');
    const rt = runtimeFor(source);
    const trace = rt.send('SensorFault', { message: 'probe failed' });
    assert.equal(rt.getDeadLetters().length, 1);
    assert.equal(rt.getDeadLetters()[0].policyName, 'DeadLetterPolicy');
    assert.ok(trace.some(t => t.from === 'immune:DeadLetterPolicy#escalate'));
    assert.ok(trace.some(t => t.signal.type === 'ImmuneEscalation'));
  });

  it('escalates after retry exhaustion when escalate is true', () => {
    const source = spongeSource.replace(
      'backoff: exponential;',
      'backoff: exponential;\n      escalate: true;',
    );
    const rt = runtimeFor(source);
    const trace = rt.send('WaterSample', { turbidity: 0.95, flowRate: 10 });
    assert.ok(trace.some(t => t.from === 'immune:SensorPolicy#escalate'));
    assert.ok(trace.some(t => t.signal.type === 'ImmuneEscalation'));
  });
});
