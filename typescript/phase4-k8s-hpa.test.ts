import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployCellFile } from './cell-deploy.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const k8sE2e = join(__dirname, '..', 'runtime-docker', 'k8s-e2e');
const divideFixture = join(__dirname, 'fixtures/divide-scale.cell');

describe('K8s prometheus-adapter manifests', () => {
  it('adapter ConfigMap maps organ label for cell_signal_queue_depth', () => {
    const yaml = readFileSync(join(k8sE2e, 'manifests/40-prometheus-adapter.yaml'), 'utf-8');
    assert.match(yaml, /cell_signal_queue_depth\{organ!=""\}/);
    assert.match(yaml, /organ: \{ resource: "namespace" \}/);
    assert.match(yaml, /prometheus-adapter/);
  });

  it('HPA external metric uses organ label selector (adapter 호환)', () => {
    const yaml = readFileSync(join(k8sE2e, 'manifests/50-hpa.yaml'), 'utf-8');
    assert.match(yaml, /name: cell_signal_queue_depth/);
    assert.match(yaml, /matchLabels:\s*\n\s*organ: WorkerOrgan/);
  });

  it('cell deploy HPA selector aligns with prometheus-adapter rule', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'cell-k8s-hpa-'));
    try {
      const result = deployCellFile({ file: divideFixture, outDir });
      assert.equal(result.ok, true, result.errors.join('; '));
      const yaml = readFileSync(result.manifests[0], 'utf-8');
      assert.match(yaml, /matchLabels:\s*\n\s*organ: WorkerOrgan/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('prometheus kubernetes_sd scrapes worker-organ pods', () => {
    const yaml = readFileSync(join(k8sE2e, 'manifests/30-prometheus.yaml'), 'utf-8');
    assert.match(yaml, /kubernetes_sd_configs/);
    assert.match(yaml, /prometheus_io_scrape/);
    assert.match(yaml, /worker-organ/);
  });
});
