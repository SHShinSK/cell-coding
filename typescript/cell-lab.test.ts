import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  runCellTestFile,
  runCellTestCase,
  evaluateExpectations,
  resolveTargetCells,
  defaultTestFilePath,
} from './cell-lab.js';
import { compile } from './compile.js';
import { readFileSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const sponge = join(__dirname, '../examples/porifera-filter/sponge-organism.cell');
const spongeSource = readFileSync(sponge, 'utf-8');

describe('resolveTargetCells', () => {
  it('resolves cell, tissue, and organ targets', () => {
    const { program } = compile(spongeSource);
    assert.deepEqual(resolveTargetCells(program, 'FilterDecideCell'), ['FilterDecideCell']);
    assert.deepEqual(resolveTargetCells(program, 'FilterTissue'), [
      'InflowSenseCell',
      'FilterDecideCell',
      'OutflowActCell',
    ]);
    assert.deepEqual(resolveTargetCells(program, 'SpongeBody'), [
      'InflowSenseCell',
      'FilterDecideCell',
      'OutflowActCell',
    ]);
  });
});

describe('evaluateExpectations', () => {
  it('matches trace and none expectations', () => {
    const trace = [
      { from: 'FilterDecideCell', signal: { type: 'FilterCommand', data: { action: 'pass' } } },
    ];
    assert.equal(
      evaluateExpectations(trace, [
        { kind: 'trace', from: 'FilterDecideCell', signal: 'FilterCommand', data: { action: 'pass' } },
        { kind: 'none', signal: 'SensorFault' },
      ]).length,
      0,
    );
    assert.ok(
      evaluateExpectations(trace, [{ kind: 'none', signal: 'FilterCommand' }]).length > 0,
    );
  });
});

describe('runCellTestFile', () => {
  it('runs sponge Cell Lab suites from sidecar JSON', () => {
    const result = runCellTestFile({ file: sponge });
    assert.equal(result.ok, true);
    assert.equal(result.failed, 0);
    assert.ok(result.passed >= 6);
    assert.equal(defaultTestFilePath(sponge).endsWith('sponge-organism.celltest.json'), true);
  });

  it('filters by target name', () => {
    const result = runCellTestFile({ file: sponge, filterTarget: 'FilterDecideCell' });
    assert.equal(result.ok, true);
    assert.equal(result.suites.length, 1);
    assert.equal(result.suites[0].cases.length, 2);
  });

  it('reports coverage summary with --coverage flag', () => {
    const result = runCellTestFile({ file: sponge, coverage: true });
    assert.ok(result.coverageSummary);
    assert.ok(result.coverageSummary!.some(r => r.target === 'FilterTissue'));
    assert.equal(result.coverageSummary!.find(r => r.target === 'FilterTissue')!.hitRatio, 1);
  });

  it('isolates InflowSenseCell from downstream tissue', () => {
    const { program } = compile(spongeSource);
    const result = runCellTestCase({
      program,
      target: 'InflowSenseCell',
      testCase: {
        name: 'no cascade',
        inject: { type: 'WaterSample', data: { turbidity: 0.2, flowRate: 10 } },
        expect: [
          { kind: 'trace', signal: 'ParticleLoad' },
          { kind: 'none', signal: 'FilterCommand' },
        ],
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.coverage.cellsInvoked, ['InflowSenseCell']);
  });
});

describe('cell test CLI', () => {
  it('exits 0 for passing sponge lab', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'test.ts', '../examples/porifera-filter/sponge-organism.cell'],
      { cwd: __dirname, windowsHide: true },
    );
    assert.match(stdout, /passed/);
  });

  it('exits 0 for spider and pet celltest sidecars', async () => {
    for (const example of [
      '../examples/spider-robot/spider-organism.cell',
      '../examples/pet-robot/pet-organism.cell',
    ]) {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--import', 'tsx', 'test.ts', example],
        { cwd: __dirname, windowsHide: true },
      );
      assert.match(stdout, /passed/);
    }
  });
});
