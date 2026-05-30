import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compile.js';
import { transpileCellFile, transpileProgram } from './transpiler.js';
import { transpileHandlerBody, transpileExpr } from './transpile-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const validator = join(__dirname, '../examples/validator.cell');
const motionAlarm = join(__dirname, '../examples/motion-alarm/motion-alarm.cell');
const sponge = join(__dirname, '../examples/porifera-filter/sponge-organism.cell');

describe('transpile-handler codegen', () => {
  it('emits if/else with callFn and bare emit', () => {
    const result = transpileCellFile({ file: validator });
    assert.equal(result.ok, true);
    assert.match(result.code, /if \(this\.callFn\("valid", input\)\)/);
    assert.match(result.code, /this\.emit\("ValidSignal"\)/);
    assert.match(result.code, /this\.emit\("ErrorSignal"\)/);
    assert.doesNotMatch(result.code, /not implemented/);
  });

  it('emits member compare and emit with field args', () => {
    const result = transpileCellFile({ file: motionAlarm, cellName: 'AlarmActCell' });
    assert.equal(result.ok, true);
    assert.match(result.code, /motion\.confidence >= 0\.7/);
    assert.match(result.code, /this\.emit\("AlarmPulse", \{ level: "triggered" \}\)/);
  });

  it('emits FilterDecideCell branch emits', () => {
    const { program } = compile(readFileSync(sponge, 'utf-8'));
    const result = transpileProgram(program, { cellName: 'FilterDecideCell' });
    assert.match(result.code, /load\.density < 0\.3/);
    assert.match(result.code, /this\.emit\("FilterCommand", \{ action: "pass" \}\)/);
    assert.match(result.code, /this\.emit\("FilterCommand", \{ action: "absorb" \}\)/);
  });

  it('transpileExpr handles binary and member access', () => {
    const { program } = compile('cell C { role:"r"; membrane { accepts: S; emits: S; } on(S x) { } } signal S { n: Number; }');
    const cell = program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(cell && cell.kind === 'CellDecl');
    const handler = cell.body.handlers[0];
    const scope = new Set([handler.paramName]);
    // synthetic - use compile for real if stmt
    const expr = compile('cell C { role:"r"; membrane{a:S;e:S} on(S x){ if (x.n > 1) { emit S; } } } signal S { n: Number; }')
      .program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(expr && expr.kind === 'CellDecl');
    const ifStmt = expr.body.handlers[0].body[0];
    assert.equal(ifStmt.kind, 'IfStmt');
    if (ifStmt.kind === 'IfStmt') {
      assert.equal(transpileExpr(ifStmt.condition, scope), 'x.n > 1');
    }
  });

  it('transpileHandlerBody supports let bindings', () => {
    const src = `
signal S { v: Number; }
cell C {
  role: "r";
  membrane { accepts: S; emits: S; }
  on(S s) {
    let threshold = 0.5;
    if (s.v > threshold) {
      emit S;
    }
  }
}`;
    const { program } = compile(src);
    const cell = program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(cell && cell.kind === 'CellDecl');
    const body = transpileHandlerBody(cell.body.handlers[0].body, 's');
    assert.match(body, /const threshold = 0\.5/);
    assert.match(body, /s\.v > threshold/);
  });

  it('emits onApoptosis for apoptosis block', () => {
    const result = transpileCellFile({ file: join(__dirname, 'fixtures/isolate-apoptosis.cell') });
    assert.equal(result.ok, true);
    assert.match(result.code, /onApoptosis\(\): void/);
    assert.match(result.code, /this\.emit\("Pong", \{ ok: false \}\)/);
  });

  it('return and absorb codegen as no-op comments', () => {
    const body = [
      { kind: 'AbsorbStmt' as const, pos: 0 },
      { kind: 'ReturnStmt' as const, pos: 0 },
      { kind: 'EmitStmt' as const, pos: 0, signalName: 'S' },
    ];
    const out = transpileHandlerBody(body, 's');
    assert.match(out, /absorb · no-op/);
    assert.match(out, /return · no-op/);
    assert.match(out, /this\.emit\("S"\)/);
  });
});
