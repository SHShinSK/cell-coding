import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { createTranspiledRuntime } from './transpiled-runtime.js';
import { BaseCell } from './transpiled-cell.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const validatorPath = join(__dirname, '../examples/validator.cell');
const motionAlarmPath = join(__dirname, '../examples/motion-alarm/motion-alarm.cell');

/** cell build 출력과 동일한 Validator · wire-up E2E */
class Validator extends BaseCell {
  static readonly role = 'Input validation · 입력값 유효성 검사';
  static readonly accepts = ['RawInput'] as const;
  static readonly emits = ['ValidSignal', 'ErrorSignal'] as const;

  onRawInput(input: { payload: string }): void {
    if (this.callFn('valid', input)) {
      this.emit('ValidSignal');
    } else {
      this.emit('ErrorSignal');
    }
  }
}

class AlarmActCell extends BaseCell {
  static readonly role = 'Alarm actuator · 알람 액추에이터';
  static readonly accepts = ['MotionDetected'] as const;
  static readonly emits = ['AlarmPulse'] as const;

  onMotionDetected(motion: { x: number; y: number; confidence: number }): void {
    if (motion.confidence >= 0.7) {
      this.emit('AlarmPulse', { level: 'triggered' });
    }
  }
}

function compileFile(path: string) {
  const source = readFileSync(path, 'utf-8');
  const { program, diagnostics } = compile(source);
  assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  return program;
}

describe('createTranspiledRuntime wire-up', () => {
  it('Validator transpiled handler matches AST interpreter trace', () => {
    const program = compileFile(validatorPath);
    const fns = {
      valid: (input: { payload: string }) => input.payload.length > 0,
    };

    const astRt = new CellRuntime(program, { functions: fns });
    const transpiledRt = createTranspiledRuntime(
      program,
      [{ cellName: 'Validator', Cell: Validator }],
      { functions: fns },
    );

    for (const payload of ['hello', '']) {
      const input = { payload };
      const astTrace = astRt.send('RawInput', input);
      const transpiledTrace = transpiledRt.send('RawInput', input);
      assert.deepEqual(
        transpiledTrace.map(t => ({ from: t.from, type: t.signal.type, data: t.signal.data })),
        astTrace.map(t => ({ from: t.from, type: t.signal.type, data: t.signal.data })),
      );
    }
  });

  it('AlarmActCell transpiled handler emits AlarmPulse above threshold', () => {
    const program = compileFile(motionAlarmPath);
    const rt = createTranspiledRuntime(
      program,
      [{ cellName: 'AlarmActCell', Cell: AlarmActCell }],
      { activeCells: ['AlarmActCell'] },
    );

    const high = rt.send('MotionDetected', { x: 1, y: 2, confidence: 0.9 });
    assert.ok(high.some(t => t.signal.type === 'AlarmPulse'));
    assert.equal(high.find(t => t.signal.type === 'AlarmPulse')?.signal.data.level, 'triggered');

    const low = rt.send('MotionDetected', { x: 1, y: 2, confidence: 0.5 });
    assert.equal(low.filter(t => t.signal.type === 'AlarmPulse').length, 0);
  });

  it('wireTranspiledHandlers throws when handler missing', () => {
    const program = compileFile(validatorPath);
    assert.throws(
      () =>
        createTranspiledRuntime(program, [
          { cellName: 'NoSuchCell', Cell: Validator },
        ]),
      /Cell 'NoSuchCell' not in program/,
    );
  });
});
