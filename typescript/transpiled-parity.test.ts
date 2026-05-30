import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCellFileAsync } from './run-cell.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

interface ParityCase {
  name: string;
  file: string;
  input: { type: string; data: Record<string, unknown> };
  functionsPath?: string;
}

const CASES: ParityCase[] = [
  {
    name: 'porifera clean',
    file: 'examples/porifera-filter/sponge-organism.cell',
    input: { type: 'WaterSample', data: { turbidity: 0.2, flowRate: 10 } },
  },
  {
    name: 'porifera fault + immune',
    file: 'examples/porifera-filter/sponge-organism.cell',
    input: { type: 'WaterSample', data: { turbidity: 0.95, flowRate: 10 } },
  },
  {
    name: 'motion-alarm high confidence',
    file: 'examples/motion-alarm/motion-alarm.cell',
    input: { type: 'MotionDetected', data: { x: 150, y: 220, confidence: 0.98 } },
  },
  {
    name: 'motion-alarm low confidence',
    file: 'examples/motion-alarm/motion-alarm.cell',
    input: { type: 'MotionDetected', data: { x: 1, y: 1, confidence: 0.2 } },
  },
  {
    name: 'validator valid',
    file: 'examples/validator.cell',
    input: { type: 'RawInput', data: { payload: 'ok' } },
  },
  {
    name: 'validator invalid',
    file: 'examples/validator.cell',
    input: { type: 'RawInput', data: { payload: '' } },
  },
  {
    name: 'pet distress immune',
    file: 'examples/pet-robot/pet-organism.cell',
    input: { type: 'OwnerPing', data: { rssi: 0.01 } },
  },
  {
    name: 'pet presence',
    file: 'examples/pet-robot/pet-organism.cell',
    input: { type: 'OwnerPing', data: { rssi: 0.8 } },
  },
  {
    name: 'spider vision stance',
    file: 'examples/spider-robot/spider-organism.cell',
    input: { type: 'VisionFrame', data: { contrast: 0.6, motion: 0.3 } },
  },
  {
    name: 'spiderling contact',
    file: 'examples/spiderling/spiderling-organism.cell',
    input: { type: 'ContactEvent', data: { pressure: 0.8, zone: 'front' } },
  },
  {
    name: 'humanoid world frame',
    file: 'examples/humanoid-robot/humanoid-organism.cell',
    input: { type: 'WorldFrame', data: { timestamp: 1 } },
  },
  {
    name: 'immune isolate apoptosis',
    file: join(__dirname, 'fixtures/isolate-apoptosis.cell'),
    input: { type: 'Ping', data: { n: -1 } },
  },
];

function traceShape(result: Awaited<ReturnType<typeof runCellFileAsync>>) {
  return result.trace.map(t => ({
    from: t.from,
    type: t.signal.type,
    data: t.signal.data,
  }));
}

describe('transpiled AST parity · 예제 전체', () => {
  for (const c of CASES) {
    it(`${c.name} matches AST trace`, async () => {
      const file = c.file.includes('examples/')
        ? join(root, c.file)
        : c.file;
      const opts = { file, input: c.input, functionsPath: c.functionsPath };

      const ast = await runCellFileAsync(opts);
      const transpiled = await runCellFileAsync({ ...opts, transpiled: true });

      assert.equal(ast.ok, true, ast.errors.join('; '));
      assert.equal(transpiled.ok, true, transpiled.errors.join('; '));
      assert.deepEqual(traceShape(transpiled), traceShape(ast));
    });
  }
});

describe('transpiler stmt semantics', () => {
  it('return/absorb are no-ops in transpiled codegen', async () => {
    const src = `
signal S { v: Number; }
cell C {
  role: "r";
  membrane { accepts: S; emits: S; }
  on(S s) {
    return
    emit S;
  }
}`;
    const { writeFileSync, mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'cell-return-'));
    const file = join(dir, 'return.cell');
    writeFileSync(file, src, 'utf-8');

    const ast = await runCellFileAsync({ file, input: { type: 'S', data: { v: 1 } } });
    const transpiled = await runCellFileAsync({ file, input: { type: 'S', data: { v: 1 } }, transpiled: true });
    assert.deepEqual(traceShape(transpiled), traceShape(ast));
  });
});
