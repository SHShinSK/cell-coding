import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InMemoryDivideCoordinator } from './in-memory-divide-coordinator.js';
import { startCloudServe, resetSharedMockRedisClient } from './cloud-serve.js';
import { startDivideGateway } from './divide-gateway.js';
import { compile } from './compile.js';
import { extractDividePolicies, recommendReplicasAsync } from './cell-divide.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const divideFixture = join(__dirname, 'fixtures', 'divide-scale.cell');

describe('DivideCoordinator', () => {
  it('aggregates queue depth across replicas', async () => {
    const coord = new InMemoryDivideCoordinator();
    await coord.setReplicaQueueDepth('WorkerOrgan', 0, 3);
    await coord.setReplicaQueueDepth('WorkerOrgan', 1, 5);
    await coord.setReplicaQueueDepth('WorkerOrgan', 2, 2);
    assert.equal(await coord.aggregateQueueDepth('WorkerOrgan', 3), 10);
  });

  it('round-robin via shared coordinator', async () => {
    const coord = new InMemoryDivideCoordinator();
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const policies = extractDividePolicies(program);

    const first = await recommendReplicasAsync(policies, 30, {
      coordinator: coord,
      organ: 'WorkerOrgan',
      replicaCount: 3,
      recordRoute: true,
    });
    const second = await recommendReplicasAsync(policies, 30, {
      coordinator: coord,
      organ: 'WorkerOrgan',
      replicaCount: 3,
      recordRoute: true,
    });

    assert.equal(first[0].targetReplica, 0);
    assert.equal(second[0].targetReplica, 1);
  });
});

describe('divide gateway + replicas', () => {
  it('routes signals through gateway to matching replica', async () => {
    resetSharedMockRedisClient();
    process.env.CELL_REDIS_MOCK = '1';
    process.env.CELL_REPLICA_COUNT = '2';
    process.env.CELL_DIVIDE_SHARED = '1';

    process.env.CELL_REPLICA_INDEX = '0';
    const replica0 = await startCloudServe({
      programFile: divideFixture,
      organ: 'WorkerOrgan',
      port: 0,
      host: '127.0.0.1',
    });
    process.env.CELL_REPLICA_INDEX = '1';
    const replica1 = await startCloudServe({
      programFile: divideFixture,
      organ: 'WorkerOrgan',
      port: 0,
      host: '127.0.0.1',
    });

    const gateway = await startDivideGateway({
      organ: 'WorkerOrgan',
      upstreams: [
        `http://127.0.0.1:${replica0.port}`,
        `http://127.0.0.1:${replica1.port}`,
      ],
      redisUrl: 'redis://mock',
      programFile: divideFixture,
      port: 0,
      host: '127.0.0.1',
    });

    try {
      const res = await fetch(`http://127.0.0.1:${gateway.port}/v1/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Task', data: { id: 'gw-1' } }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        trace?: Array<{ signal: { type: string } }>;
        skipped?: boolean;
        gateway?: { targetReplica: number; upstream: string };
      };
      assert.ok(body.gateway);
      assert.equal(body.gateway!.targetReplica, 0);
      assert.ok(body.trace?.some(t => t.signal.type === 'Done'));
    } finally {
      delete process.env.CELL_REPLICA_INDEX;
      delete process.env.CELL_REPLICA_COUNT;
      delete process.env.CELL_DIVIDE_SHARED;
      delete process.env.CELL_REDIS_MOCK;
      await gateway.close();
      await replica0.close();
      await replica1.close();
    }
  });
});

describe('cloud-serve shared divide', () => {
  it('skips processing on replica mismatch', async () => {
    resetSharedMockRedisClient();
    process.env.CELL_REDIS_MOCK = '1';
    process.env.CELL_REPLICA_INDEX = '1';
    process.env.CELL_REPLICA_COUNT = '2';
    process.env.CELL_DIVIDE_SHARED = '1';

    const handle = await startCloudServe({
      programFile: divideFixture,
      organ: 'WorkerOrgan',
      port: 0,
      host: '127.0.0.1',
    });

    try {
      const res = await fetch(`http://127.0.0.1:${handle.port}/v1/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Task', data: { id: 'r1' } }),
      });
      const body = (await res.json()) as {
        skipped?: boolean;
        replicaIndex?: number;
        targetReplica?: number;
      };
      assert.equal(body.replicaIndex, 1);
      assert.equal(typeof body.skipped, 'boolean');
    } finally {
      delete process.env.CELL_REPLICA_INDEX;
      delete process.env.CELL_REPLICA_COUNT;
      delete process.env.CELL_DIVIDE_SHARED;
      delete process.env.CELL_REDIS_MOCK;
      await handle.close();
    }
  });
});
