import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { buildViewerInspectSnapshot } from './viewer-inspect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sponge = readFileSync(join(__dirname, '../examples/porifera-filter/sponge-organism.cell'), 'utf-8');
const spider = readFileSync(join(__dirname, '../examples/spider-robot/spider-organism.cell'), 'utf-8');

describe('buildViewerInspectSnapshot', () => {
  it('includes sponge organism hierarchy', () => {
    const { program, diagnostics } = compile(sponge);
    const snap = buildViewerInspectSnapshot(program, diagnostics);
    assert.equal(snap.ok, true);
    assert.equal(snap.organism?.name, 'SpongeOrganism');
    assert.equal(snap.hierarchy.length, 1);
    assert.equal(snap.hierarchy[0]?.cells.length, 3);
    assert.ok(snap.immunePolicies.some(p => p.errorType === 'SensorFault'));
  });

  it('includes spider nervous routes', () => {
    const { program, diagnostics } = compile(spider);
    const snap = buildViewerInspectSnapshot(program, diagnostics);
    assert.equal(snap.stats.cellCount, 10);
    assert.equal(snap.stats.organCount, 3);
    assert.ok(snap.nervousRoutes.some(r => r.source.includes('ThreatAssessment')));
  });
});
