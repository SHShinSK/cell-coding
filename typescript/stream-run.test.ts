import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import {
  resolveStream,
  expandStreamSamples,
  parseStreamSamplePayload,
} from './stream-run.js';
import { runCellFile } from './run-cell.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const spiderlingSim = readFileSync(
  join(__dirname, '../examples/spiderling-sim/spiderling-sim-organism.cell'),
  'utf-8',
);

describe('stream-run helpers', () => {
  it('resolves single ImuStream decl', () => {
    const { program } = compile(spiderlingSim);
    const resolved = resolveStream(program);
    assert.ok(!('error' in resolved));
    if ('error' in resolved) return;
    assert.equal(resolved.decl.name, 'ImuStream');
    assert.equal(resolved.sampleType, 'ImuSample');
    assert.equal(resolved.intervalMs, 10);
  });

  it('expands template samples with virtual timestamps', () => {
    const samples = expandStreamSamples({ timestamp: 100, accelX: 1 }, 3, 10);
    assert.equal(samples.length, 3);
    assert.equal(samples[0]?.timestamp, 100);
    assert.equal(samples[1]?.timestamp, 110);
    assert.equal(samples[2]?.timestamp, 120);
  });

  it('parses @file array payloads', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cell-stream-'));
    const file = join(dir, 'samples.json');
    writeFileSync(
      file,
      JSON.stringify([
        { timestamp: 1, accelX: 0.1 },
        { timestamp: 11, accelX: 0.2 },
      ]),
    );
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const parsed = parseStreamSamplePayload('@samples.json', {}, 1, 10);
      assert.ok(!('error' in parsed));
      if ('error' in parsed) return;
      assert.equal(parsed.length, 2);
      assert.equal(parsed[1]?.accelX, 0.2);
    } finally {
      process.chdir(cwd);
    }
  });
});

describe('runCellFile stream mode', () => {
  it('runs spiderling-sim ImuStream batch to StanceHold', () => {
    const result = runCellFile({
      file: join(__dirname, '../examples/spiderling-sim/spiderling-sim-organism.cell'),
      input: {
        type: 'ImuSample',
        data: {
          timestamp: 1,
          accelX: 0.1,
          accelY: 0.2,
          accelZ: 9.81,
          gyroX: 0,
          gyroY: 0,
          gyroZ: 0.05,
        },
      },
      stream: {
        name: 'ImuStream',
        samples: expandStreamSamples(
          {
            timestamp: 1,
            accelX: 0.1,
            accelY: 0.2,
            accelZ: 9.81,
            gyroX: 0,
            gyroY: 0,
            gyroZ: 0.05,
          },
          3,
          10,
        ),
        intervalMs: 10,
      },
    });
    assert.equal(result.ok, true);
    assert.ok(result.stream);
    assert.equal(result.stream?.sampleCount, 3);
    assert.equal(result.stream?.virtualElapsedMs, 20);
    assert.ok(result.trace.some(t => t.from === 'stream:ImuStream'));
    assert.ok(result.trace.some(t => t.signal.type === 'StanceHold'));
  });

  it('prefers onSample for stream inject and on for external pulse', () => {
    const src = [
      'signal S { v: Number; }',
      'signal Out { tag: String; }',
      'stream St { rate: 10Hz; sample: S; }',
      'cell PulseCell { role: "p"; membrane { accepts: S; emits: Out; }',
      '  on(S s) { emit Out(tag: "pulse"); } }',
      'cell StreamCell { role: "s"; membrane { accepts: S; emits: Out; }',
      '  onSample(S s) { emit Out(tag: "stream"); } }',
    ].join(' ');
    const { program } = compile(src);
    const rt = new CellRuntime(program);
    const ext = rt.send('S', { v: 1 });
    assert.ok(ext.some(t => t.signal.type === 'Out' && t.signal.data.tag === 'pulse'));
    const batch = rt.sendStream('S', [{ v: 2 }], { streamName: 'St' });
    assert.ok(batch.some(t => t.from === 'stream:St'));
    assert.ok(batch.some(t => t.signal.type === 'Out' && t.signal.data.tag === 'stream'));
  });
});
