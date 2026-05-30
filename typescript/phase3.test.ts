import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { transpileCellFile, transpileProgram } from './transpiler.js';
import { inspectCellFile } from './cell-inspect.js';
import { compile } from './compile.js';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const validator = join(__dirname, '../examples/validator.cell');
const sponge = join(__dirname, '../examples/porifera-filter/sponge-organism.cell');

describe('transpiler', () => {
  it('transpiles validator.cell to TypeScript classes', () => {
    const result = transpileCellFile({ file: validator });
    assert.equal(result.ok, true);
    assert.ok(result.code.includes('export class Validator extends BaseCell'));
    assert.ok(result.code.includes("from '../transpiled-cell.js'"));
    assert.ok(result.code.includes('export interface RawInput'));
    assert.ok(result.code.includes('onRawInput'));
    assert.ok(result.code.includes('this.callFn("valid", input)'));
    assert.deepEqual(result.cells, ['Validator']);
  });

  it('transpiles a single cell by name', () => {
    const source = readFileSync(sponge, 'utf-8');
    const { program } = compile(source);
    const result = transpileProgram(program, { cellName: 'FilterDecideCell' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.cells, ['FilterDecideCell']);
    assert.equal(result.code.includes('InflowSenseCell'), false);
  });
});

describe('inspectCellFile', () => {
  it('reports sponge hierarchy and stats', () => {
    const result = inspectCellFile({ file: sponge });
    assert.equal(result.ok, true);
    assert.equal(result.stats.cellCount, 3);
    assert.equal(result.stats.tissueCount, 1);
    assert.ok(result.organism?.name === 'SpongeOrganism');
    assert.ok(result.organism?.immune?.policies.some(p => p.errorType === 'SensorFault'));
  });

  it('scopes inspect to FilterTissue target', () => {
    const result = inspectCellFile({ file: sponge, target: 'FilterTissue' });
    assert.equal(result.ok, true);
    assert.equal(result.target, 'FilterTissue');
    assert.equal(result.cells.length, 3);
    assert.equal(result.tissues.length, 1);
    assert.equal(result.tissues[0].name, 'FilterTissue');
  });
});

describe('Phase 3 CLI', () => {
  it('cell build --stdout emits TypeScript for validator', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'build.ts', '--stdout', '../examples/validator.cell'],
      { cwd: __dirname, windowsHide: true },
    );
    assert.match(stdout, /export class Validator extends BaseCell/);
  });

  it('cell inspect exits 0 for sponge FilterTissue', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'inspect.ts', '../examples/porifera-filter/sponge-organism.cell', 'FilterTissue'],
      { cwd: __dirname, windowsHide: true },
    );
    assert.match(stdout, /FilterTissue/);
    assert.match(stdout, /inspect OK/);
  });
});
