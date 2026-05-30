import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import {
  buildOrganIndex,
  eligibleOrgansForEmit,
  filterHandlersByOrganScope,
} from './nervous-routing.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(__dirname, p), 'utf-8');

const spiderSource = read('../examples/spider-robot/spider-organism.cell');
const isolatedSource = read('fixtures/isolated-organs.cell');
const routedSource = read('fixtures/routed-organs.cell');
const conditionalSource = read('fixtures/conditional-organs.cell');
const transformSource = read('fixtures/transform-organs.cell');

const noopEval = () => true;

function runtimeFor(source: string): CellRuntime {
  const { program, diagnostics } = compile(source);
  assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  return new CellRuntime(program);
}

describe('buildOrganIndex', () => {
  it('maps spider cells to three organs and nervous routes', () => {
    const { program } = compile(spiderSource);
    const index = buildOrganIndex(program);

    assert.equal(index.cellOrgan.get('FuseDecideCell'), 'SensingOrgan');
    assert.equal(index.cellOrgan.get('PathDecideCell'), 'LocomotionOrgan');
    assert.equal(index.cellOrgan.get('WebActCell'), 'ActionOrgan');
    assert.deepEqual(
      index.nervousTargets.get('SensingOrgan.ThreatAssessment'),
      ['LocomotionOrgan', 'ActionOrgan'],
    );
  });
});

describe('filterHandlersByOrganScope', () => {
  it('limits SharedPing to OrganA without nervous route', () => {
    const { program } = compile(isolatedSource);
    const index = buildOrganIndex(program);
    const handlers = [
      { cell: 'PingCellA', signalType: 'SharedPing' },
      { cell: 'PingCellB', signalType: 'SharedPing' },
    ];

    const scoped = filterHandlersByOrganScope(
      handlers,
      index,
      { type: 'SharedPing', data: {} },
      'PingCellA',
      noopEval,
    );

    assert.deepEqual(scoped.map(h => h.handler.cell), ['PingCellA']);
  });

  it('includes nervous target organ handlers', () => {
    const { program } = compile(routedSource);
    const index = buildOrganIndex(program);
    const handlers = [
      { cell: 'PingCellA', signalType: 'SharedPing' },
      { cell: 'PingCellB', signalType: 'SharedPing' },
    ];

    const scoped = filterHandlersByOrganScope(
      handlers,
      index,
      { type: 'SharedPing', data: {} },
      'PingCellA',
      noopEval,
    );

    assert.deepEqual(scoped.map(h => h.handler.cell).sort(), ['PingCellA', 'PingCellB']);
  });
});

describe('nervous organ-scoped runtime', () => {
  it('blocks cross-organ delivery without nervous wiring', () => {
    const rt = runtimeFor(isolatedSource);
    const trace = rt.send('Start', {});
    assert.ok(trace.some(t => t.signal.type === 'SharedPing'));
    assert.equal(trace.some(t => t.signal.type === 'DoneB'), false);
  });

  it('delivers across organs when nervous route exists', () => {
    const rt = runtimeFor(routedSource);
    const trace = rt.send('Start', {});
    assert.deepEqual(
      trace.map(t => t.signal.type),
      ['Start', 'SharedPing', 'DoneB'],
    );
  });

  it('routes spider ThreatAssessment to locomotion and action organs', () => {
    const { program } = compile(spiderSource);
    const index = buildOrganIndex(program);
    const organs = eligibleOrgansForEmit(index, 'FuseDecideCell', 'ThreatAssessment');
    assert.notEqual(organs, 'global');
    assert.deepEqual([...organs!].sort(), ['ActionOrgan', 'LocomotionOrgan', 'SensingOrgan']);
  });

  it('keeps spider PathCommand inside LocomotionOrgan', () => {
    const rt = runtimeFor(spiderSource);
    const trace = rt.send('VisionFrame', { contrast: 0.6, motion: 0.3 });
    const pathCmdIdx = trace.findIndex(t => t.from === 'PathDecideCell' && t.signal.type === 'PathCommand');
    assert.ok(pathCmdIdx >= 0);
    const afterPath = trace.slice(pathCmdIdx + 1);
    assert.ok(afterPath.some(t => t.from === 'GaitActCell' && t.signal.type === 'GaitStep'));
    assert.equal(afterPath.some(t => t.from === 'WebActCell' && t.signal.type === 'PathCommand'), false);
  });

  it('delivers only when nervous when-condition matches', () => {
    const rt = runtimeFor(conditionalSource);
    const blocked = rt.send('Start', { tag: 'skip' });
    assert.equal(blocked.some(t => t.signal.type === 'DoneB'), false);

    const rt2 = runtimeFor(conditionalSource);
    const routed = rt2.send('Start', { tag: 'route' });
    assert.ok(routed.some(t => t.signal.type === 'DoneB'));
  });

  it('applies nervous transform before cross-organ delivery', () => {
    const rt = runtimeFor(transformSource);
    const trace = rt.send('Start', { tag: 'hello' });
    assert.ok(trace.some(t => t.signal.type === 'DoneB'));
    assert.equal(trace.some(t => t.from === 'PingCellB' && t.signal.type === 'SharedPing'), false);
    assert.equal(
      trace.filter(t => t.from === 'PingCellA' && t.signal.type === 'SharedPing').length,
      1,
    );
  });
});
