import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatPrometheusMetrics, shouldExposePrometheusMetrics } from './cell-metrics.js';
import { startCloudServe } from './cloud-serve.js';
import { compile } from './compile.js';
import { extractDividePolicies, recommendReplicas } from './cell-divide.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const divideFixture = join(__dirname, 'fixtures', 'divide-scale.cell');

describe('Prometheus metrics export', () => {
  it('formats cell_signal_queue_depth with organ label', () => {
    const text = formatPrometheusMetrics({
      organ: 'WorkerOrgan',
      queueDepth: 12,
    });
    assert.match(text, /# TYPE cell_signal_queue_depth gauge/);
    assert.match(text, /cell_signal_queue_depth\{organ="WorkerOrgan"\} 12/);
  });

  it('includes divide and nervous gauges when provided', () => {
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const divide = recommendReplicas(extractDividePolicies(program), 25);
    const text = formatPrometheusMetrics({
      organ: 'WorkerOrgan',
      queueDepth: 25,
      divide,
      nervous: {
        localOrgan: 'WorkerOrgan',
        consumerGroup: 'cell-nervous',
        consumerName: 'worker-1',
        published: 0,
        consumed: 3,
        acked: 3,
        reclaimed: 1,
        pending: 0,
        lastIngressId: '0',
        autoClaimMinIdleMs: 30000,
        autoClaimEnabled: true,
      },
    });
    assert.match(text, /cell_divide_replicas_recommended\{organ="WorkerOrgan",cell="WorkerCell",strategy="round-robin"\}/);
    assert.match(text, /cell_nervous_reclaimed\{organ="WorkerOrgan",consumer_group="cell-nervous"\} 1/);
  });

  it('shouldExposePrometheusMetrics respects CELL_METRICS=0', () => {
    const prev = process.env.CELL_METRICS;
    process.env.CELL_METRICS = '0';
    assert.equal(shouldExposePrometheusMetrics(), false);
    if (prev === undefined) delete process.env.CELL_METRICS;
    else process.env.CELL_METRICS = prev;
  });
});

describe('cloud-serve GET /metrics', () => {
  it('returns Prometheus text for divide organ', async () => {
    process.env.CELL_REDIS_MOCK = '1';
    const handle = await startCloudServe({
      programFile: divideFixture,
      organ: 'WorkerOrgan',
      port: 0,
      host: '127.0.0.1',
    });

    try {
      const res = await fetch(`http://127.0.0.1:${handle.port}/metrics`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
      const body = await res.text();
      assert.match(body, /cell_signal_queue_depth\{organ="WorkerOrgan"\}/);
      assert.match(body, /cell_divide_replicas_recommended/);
    } finally {
      await handle.close();
      delete process.env.CELL_REDIS_MOCK;
    }
  });
});
