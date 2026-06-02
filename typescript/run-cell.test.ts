import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runCellFile, runCellFileAsync } from './run-cell.js';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const sponge = join(__dirname, '../examples/porifera-filter/sponge-organism.cell');
const motionAlarm = join(__dirname, '../examples/motion-alarm/motion-alarm.cell');
const validator = join(__dirname, '../examples/validator.cell');

describe('runCellFile', () => {
  it('returns bundle with trace, lifecycle, and steps for clean sponge run', () => {
    const result = runCellFile({
      file: sponge,
      input: { type: 'WaterSample', data: { turbidity: 0.2, flowRate: 10 } },
      id: 'porifera-clean',
    });
    assert.equal(result.ok, true);
    assert.ok(result.bundle);
    assert.ok(result.trace.length >= 4);
    assert.equal(result.lifecycle.states.InflowSenseCell, 'dormant');
    assert.ok(result.bundle.steps.length === result.trace.length);
    assert.deepEqual(
      result.trace.map(t => t.signal.type),
      ['WaterSample', 'ParticleLoad', 'FilterCommand', 'ExhalePulse'],
    );
  });

  it('returns ok:false on compile errors', () => {
    const broken = runCellFile({
      file: join(__dirname, 'fixtures/broken.cell'),
      input: { type: 'Ping', data: {} },
    });
    assert.equal(broken.ok, false);
    assert.ok(broken.errors.length > 0);
    assert.equal(broken.bundle, undefined);
  });
});

describe('runCellFileAsync transpiled', () => {
  it('matches AST trace for sponge clean cascade', async () => {
    const input = { type: 'WaterSample', data: { turbidity: 0.2, flowRate: 10 } };
    const ast = runCellFile({ file: sponge, input });
    const transpiled = await runCellFileAsync({ file: sponge, input, transpiled: true });
    assert.equal(ast.ok, true);
    assert.equal(transpiled.ok, true);
    assert.deepEqual(
      transpiled.trace.map(t => ({ from: t.from, type: t.signal.type, data: t.signal.data })),
      ast.trace.map(t => ({ from: t.from, type: t.signal.type, data: t.signal.data })),
    );
  });

  it('runs motion-alarm with transpiled handlers', async () => {
    const result = await runCellFileAsync({
      file: motionAlarm,
      input: { type: 'MotionDetected', data: { x: 1, y: 2, confidence: 0.9 } },
      transpiled: true,
    });
    assert.equal(result.ok, true);
    assert.ok(result.trace.some(t => t.signal.type === 'AlarmPulse'));
  });

  it('rejects sync runCellFile with transpiled flag', () => {
    assert.throws(
      () =>
        runCellFile({
          file: sponge,
          input: { type: 'WaterSample', data: {} },
          transpiled: true,
        }),
      /runCellFileAsync/,
    );
  });

  it('runs validator with transpiled handlers and sidecar functions', async () => {
    const ok = await runCellFileAsync({
      file: validator,
      input: { type: 'RawInput', data: { payload: 'hello' } },
      transpiled: true,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.trace.at(-1)?.signal.type, 'ValidSignal');

    const bad = await runCellFileAsync({
      file: validator,
      input: { type: 'RawInput', data: { payload: '' } },
      transpiled: true,
    });
    assert.equal(bad.ok, true);
    assert.equal(bad.trace.at(-1)?.signal.type, 'ErrorSignal');
  });
});

describe('cell run CLI', () => {
  it('emits JSON with immune retry steps for fault scenario', async () => {
    const jsonArg = JSON.stringify({ turbidity: 0.95, flowRate: 10 });
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        '--import', 'tsx', 'run.ts',
        '--json',
        '../examples/porifera-filter/sponge-organism.cell',
        'WaterSample',
        jsonArg,
      ],
      { cwd: __dirname, windowsHide: true },
    );
    const payload = JSON.parse(stdout);
    assert.equal(payload.live, true);
    assert.ok(payload.result.ok);
    assert.ok(payload.scenarios.length === 1);
    assert.ok(payload.result.trace.some((t: { signal: { type: string } }) => t.signal.type === 'SensorFault'));
    assert.ok(
      payload.result.trace.some((t: { from: string }) => t.from.startsWith('immune:SensorPolicy#retry:')),
    );
  });

  it('runs --transpiled and matches AST signal types', async () => {
    const jsonArg = JSON.stringify({ turbidity: 0.2, flowRate: 10 });
    const { stdout: astOut } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'run.ts', '--json', '../examples/porifera-filter/sponge-organism.cell', 'WaterSample', jsonArg],
      { cwd: __dirname, windowsHide: true },
    );
    const { stdout: trOut } = await execFileAsync(
      process.execPath,
      [
        '--import', 'tsx', 'run.ts', '--json', '--transpiled',
        '../examples/porifera-filter/sponge-organism.cell', 'WaterSample', jsonArg,
      ],
      { cwd: __dirname, windowsHide: true },
    );
    const ast = JSON.parse(astOut);
    const transpiled = JSON.parse(trOut);
    assert.deepEqual(
      transpiled.result.trace.map((t: { signal: { type: string } }) => t.signal.type),
      ast.result.trace.map((t: { signal: { type: string } }) => t.signal.type),
    );
  });

  it('includes observability.jaegerUrl with --jaeger', async () => {
    const jsonArg = JSON.stringify({ x: 1, y: 2, confidence: 0.9 });
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        '--import', 'tsx', 'run.ts', '--json', '--jaeger', 'http://127.0.0.1:16686',
        '../examples/motion-alarm/motion-alarm.cell', 'MotionDetected', jsonArg,
      ],
      { cwd: __dirname, windowsHide: true },
    );
    const payload = JSON.parse(stdout);
    assert.match(payload.observability.jaegerUrl, /127\.0\.0\.1:16686\/search\?service=cell-motion-alarm/);
  });

  it('runs --stream batch on spiderling-sim', async () => {
    const jsonArg = JSON.stringify({
      timestamp: 1,
      accelX: 0.1,
      accelY: 0.2,
      accelZ: 9.81,
      gyroX: 0,
      gyroY: 0,
      gyroZ: 0.05,
    });
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        '--import', 'tsx', 'run.ts',
        '--json',
        '--stream', 'ImuStream',
        '--samples', '3',
        '--interval-ms', '10',
        '../examples/spiderling-sim/spiderling-sim-organism.cell',
        'ImuSample',
        jsonArg,
      ],
      { cwd: __dirname, windowsHide: true },
    );
    const payload = JSON.parse(stdout);
    assert.equal(payload.result.ok, true);
    assert.equal(payload.result.stream.sampleCount, 3);
    assert.ok(payload.result.trace.some((t: { from: string }) => t.from === 'stream:ImuStream'));
    assert.ok(payload.result.trace.some((t: { signal: { type: string } }) => t.signal.type === 'StanceHold'));
  });
});
