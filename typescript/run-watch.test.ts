import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { buildLiveRunPayload } from './run-payload.js';
import { runCellFile } from './run-cell.js';
import { writeLiveRunOnce } from './run-watch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sponge = join(__dirname, '../examples/porifera-filter/sponge-organism.cell');

describe('buildLiveRunPayload', () => {
  it('marks watch metadata for streaming viewers', () => {
    const result = runCellFile({
      file: sponge,
      input: { type: 'WaterSample', data: { turbidity: 0.2, flowRate: 10 } },
    });
    const payload = buildLiveRunPayload(result, { watch: true, pollIntervalMs: 750 });
    assert.equal(payload.live, true);
    assert.equal(payload.watch, true);
    assert.equal(payload.pollIntervalMs, 750);
    assert.ok(payload.generatedAt);
    assert.equal(payload.scenarios.length, 1);
  });
});

describe('writeLiveRunOnce', () => {
  it('writes watch payload JSON to --out path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cell-watch-'));
    const out = join(dir, 'live-run.json');
    try {
      const result = await writeLiveRunOnce({
        file: sponge,
        out,
        input: { type: 'WaterSample', data: { turbidity: 0.95, flowRate: 10 } },
        pollIntervalMs: 500,
      });
      assert.equal(result.ok, true);
      const payload = JSON.parse(readFileSync(out, 'utf-8'));
      assert.equal(payload.watch, true);
      assert.equal(payload.pollIntervalMs, 500);
      assert.ok(payload.result.trace.some((t: { from: string }) => t.from.includes('#backoff:')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
