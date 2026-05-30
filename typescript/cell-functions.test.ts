import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCellFunctions, resolveCellFunctions, cellFunctionBuiltins } from './cell-functions.js';
import { jaegerSearchUrl } from './otel-export.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const validatorFns = join(__dirname, '../examples/validator.functions.json');

describe('cell-functions loader', () => {
  it('loads builtin from JSON sidecar', async () => {
    const fns = await loadCellFunctions(`@${validatorFns}`);
    assert.equal(typeof fns.valid, 'function');
    assert.equal(fns.valid({ payload: 'ok' }), true);
    assert.equal(fns.valid({ payload: '' }), false);
  });

  it('resolveCellFunctions discovers sidecar next to .cell', async () => {
    const fns = await resolveCellFunctions(join(__dirname, '../examples/validator.cell'));
    assert.equal(fns.valid({ payload: 'x' }), true);
  });

  it('cellFunctionBuiltins includes nonEmptyPayload', () => {
    assert.equal(cellFunctionBuiltins.nonEmptyPayload({ payload: 'a' }), true);
  });
});

describe('jaegerSearchUrl', () => {
  it('builds Jaeger UI search link', () => {
    const url = jaegerSearchUrl('cell-motion-alarm', 'http://127.0.0.1:16686');
    assert.match(url, /\/search\?service=cell-motion-alarm/);
  });
});
