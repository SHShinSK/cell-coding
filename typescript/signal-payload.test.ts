import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile } from './compile.js';
import { CellRuntime, SignalPayloadError } from './runtime.js';

const SOURCE = `
signal Base { id: String; }
signal Reading extends Base {
  value: Number;
  label?: String;
}
signal Done { value: Number; }
cell Echo {
  role: "echo";
  membrane { accepts: Reading; emits: Done; }
  on(Reading r) { emit Done(value: r.value); }
}
tissue T { flow linear { Echo } }
organ O { tissues { T } exports { Done } }
organism M { organs { O } }
`;

function runtime(): CellRuntime {
  const { program } = compile(SOURCE);
  return new CellRuntime(program);
}

describe('external payload validation · 외부 페이로드 검증', () => {
  it('accepts a valid payload, inherited field and extras included', () => {
    const trace = runtime().send('Reading', { id: 'a', value: 1, extra: true });
    assert.ok(trace.some(t => t.signal.type === 'Done'));
  });

  it('allows an optional field to be omitted', () => {
    assert.doesNotThrow(() => runtime().send('Reading', { id: 'a', value: 1 }));
  });

  it('rejects a missing required field', () => {
    assert.throws(
      () => runtime().send('Reading', { id: 'a' }),
      (e: unknown) => e instanceof SignalPayloadError && /missing field 'value'/.test(e.message),
    );
  });

  it('rejects a missing inherited field', () => {
    assert.throws(() => runtime().send('Reading', { value: 1 }), /missing field 'id'/);
  });

  it('rejects a wrong scalar type and NaN', () => {
    assert.throws(() => runtime().send('Reading', { id: 'a', value: 'bad' }), /must be Number/);
    assert.throws(() => runtime().send('Reading', { id: 'a', value: NaN }), /must be Number/);
  });

  it('validates each stream sample', () => {
    assert.throws(
      () => runtime().sendStream('Reading', [{ id: 'a', value: 1 }, { id: 'a' }]),
      SignalPayloadError,
    );
  });
});
