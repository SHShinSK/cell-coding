import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { PhysicalSlaGuard, sensorAgeMs, SLA_VIOLATION_TYPE } from './physical-sla.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const spiderSimSource = readFileSync(
  join(__dirname, '../examples/spider-robot-sim/spider-sim-organism.cell'),
  'utf-8',
);
const spiderlingSimSource = readFileSync(
  join(__dirname, '../examples/spiderling-sim/spiderling-sim-organism.cell'),
  'utf-8',
);

describe('PhysicalSlaGuard unit', () => {
  it('computes epoch sensor age from timestamp field', () => {
    const age = sensorAgeMs(
      { type: 'ImuSample', data: { timestamp: Date.now() - 250 } },
      Date.now(),
      0,
    );
    assert.ok(age != null && age >= 250);
  });

  it('prefers ingestWallMs over timestamp for age', () => {
    const age = sensorAgeMs(
      {
        type: 'VisionFrame',
        data: { timestamp: Date.now() - 10_000 },
        ingestWallMs: Date.now() - 50,
      },
      Date.now(),
      0,
    );
    assert.ok(age != null && age >= 50 && age < 200);
  });

  it('rejects stale samples when staleness budget exceeded', () => {
    const guard = new PhysicalSlaGuard();
    const verdict = guard.checkAccept(
      'VisionSenseCell',
      { type: 'VisionFrame', data: { timestamp: Date.now() - 500 } },
      { stalenessRejectMs: 100, onViolation: 'drop' },
      0,
      Date.now(),
    );
    assert.equal(verdict.allow, false);
    assert.equal(verdict.violation?.kind, 'staleness');
  });

  it('rate-limits accepts in a 1s virtual window', () => {
    const guard = new PhysicalSlaGuard();
    const sla = { rateMaxHz: 2, onViolation: 'drop' };
    const sig = { type: 'VisionFrame', data: {} };
    assert.equal(guard.checkAccept('C', sig, sla, 0, Date.now()).allow, true);
    assert.equal(guard.checkAccept('C', sig, sla, 100, Date.now()).allow, true);
    const third = guard.checkAccept('C', sig, sla, 200, Date.now());
    assert.equal(third.allow, false);
    assert.equal(third.violation?.kind, 'rate');
  });
});

describe('CellRuntime physical SLA', () => {
  it('records SlaViolation and drops stale VisionFrame on spider-sim', () => {
    const { program, diagnostics } = compile(spiderSimSource);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
    const rt = new CellRuntime(program);
    const trace = rt.send('VisionFrame', {
      contrast: 0.6,
      motion: 0.3,
      timestamp: Date.now() - 5000,
    });
    assert.ok(trace.some(t => t.from === 'sla:VisionSenseCell#staleness'));
    assert.ok(trace.some(t => t.signal.type === SLA_VIOLATION_TYPE));
    assert.equal(trace.filter(t => t.signal.type === 'VisualCue').length, 0);
  });

  it('annotates physical latency on successful spiderling-sim run', () => {
    const { program, diagnostics } = compile(spiderlingSimSource);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
    const rt = new CellRuntime(program, {
      slaSimulateLatencyMs: { ImuStreamGateCell: 25 },
    });
    const trace = rt.send('ImuSample', {
      timestamp: Date.now(),
      accelX: 0.1,
      accelY: 0.2,
      accelZ: 9.81,
      gyroX: 0,
      gyroY: 0,
      gyroZ: 0.05,
    });
    const gateEmit = trace.find(t => t.from === 'ImuStreamGateCell' && t.signal.type === 'ContactEvent');
    assert.ok(gateEmit?.physical?.latencyMs != null);
    assert.ok(gateEmit?.physical?.streamSeq === 1);
    assert.ok(trace.some(t => t.from === 'sla:ImuStreamGateCell#latency'));
  });

  it('uses ingestWallMs for external bridge inject staleness', () => {
    const { program } = compile(spiderSimSource);
    const rt = new CellRuntime(program);
    const trace = rt.send('VisionFrame', {
      contrast: 0.6,
      motion: 0.3,
      ingestWallMs: Date.now() - 5000,
    });
    assert.ok(trace.some(t => t.from === 'sla:VisionSenseCell#staleness'));
  });

  it('holdLastSafe re-emits last safe output after staleness drop', () => {
    const { program } = compile(spiderSimSource);
    const rt = new CellRuntime(program);
    const trace = rt.sendStream(
      'VisionFrame',
      [
        { contrast: 0.6, motion: 0.3, timestamp: Date.now() },
        { contrast: 0.6, motion: 0.3, timestamp: Date.now() - 5000 },
      ],
      { streamName: 'VisionStream', intervalMs: 10 },
    );
    assert.ok(trace.some(t => t.from === 'sla:VisionSenseCell#staleness'));
    assert.ok(trace.some(t => t.from === 'sla:VisionSenseCell#holdLastSafe'));
    assert.ok(trace.some(t => t.signal.type === 'VisualCue'));
  });
});
