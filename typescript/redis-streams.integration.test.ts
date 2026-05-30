// ═══════════════════════════════════════════════════════════
//  Cell Coding — Redis Streams integration (testcontainers)
//  실 Redis 7 · XADD/XREADGROUP/XAUTOCLAIM
//  실행: CELL_INTEGRATION=1 npm run test:integration
// ═══════════════════════════════════════════════════════════

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createRedisStreamsClient } from './redis-streams-client.js';
import { NervousFabric, nervousStreamKey } from './nervous-fabric.js';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { resolveTargetCells } from './cell-lab.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const runIntegration = process.env.CELL_INTEGRATION === '1';
const suite = runIntegration ? describe : describe.skip;

const __dirname = dirname(fileURLToPath(import.meta.url));
const routedSource = readFileSync(join(__dirname, 'fixtures/routed-organs.cell'), 'utf-8');

suite('Redis Streams integration (testcontainers)', () => {
  let container: StartedTestContainer | undefined;
  let redisUrl: string;
  let dockerAvailable = true;

  before(async () => {
    try {
      container = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
      redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
    } catch (e) {
      dockerAvailable = false;
      if (process.env.GITHUB_ACTIONS === 'true') {
        throw e;
      }
      console.warn(
        '[integration] Docker unavailable · testcontainers skip:',
        e instanceof Error ? e.message : String(e),
      );
    }
  });

  after(async () => {
    await container?.stop();
  });

  it('createRedisStreamsClient XADD/XREADGROUP/XACK', async () => {
    if (!dockerAvailable) return;
    assert.ok(container, 'Redis container should be started when Docker is available');
    const client = await createRedisStreamsClient(redisUrl);
    try {
      const stream = 'cell:test:bus';
      await client.xGroupCreate(stream, 'workers', '0', true);
      await client.xAdd(stream, { payload: '{"type":"Ping"}', priority: 'normal' });
      const batch = await client.xReadGroup(stream, 'workers', 'c1', 10);
      assert.equal(batch.length, 1);
      assert.equal(batch[0].fields.payload, '{"type":"Ping"}');
      const acked = await client.xAck(stream, 'workers', batch[0].id);
      assert.equal(acked, 1);
      assert.equal(await client.xPendingCount(stream, 'workers'), 0);
    } finally {
      await client.close();
    }
  });

  it('XAUTOCLAIM reclaims idle PEL entries', async () => {
    if (!dockerAvailable) return;
    const client = await createRedisStreamsClient(redisUrl);
    try {
      const stream = 'cell:test:autoclaim';
      await client.xGroupCreate(stream, 'g', '0', true);
      await client.xAdd(stream, { payload: 'stuck' });
      const first = await client.xReadGroup(stream, 'g', 'consumer-a', 1);
      assert.equal(first.length, 1);
      await new Promise(r => setTimeout(r, 50));
      const reclaimed = await client.xAutoClaim(stream, 'g', 'consumer-b', 1, '0-0', 10);
      assert.ok(reclaimed.entries.length >= 1);
      assert.equal(reclaimed.entries[0].fields.payload, 'stuck');
    } finally {
      await client.close();
    }
  });

  it('NervousFabric cross-organ delivery over real Redis', async () => {
    if (!dockerAvailable) return;
    const { program, diagnostics } = compile(routedSource);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);

    const client = await createRedisStreamsClient(redisUrl);
    try {
      const fabricA = new NervousFabric({ client, localOrgan: 'OrganA', program });
      const fabricB = new NervousFabric({ client, localOrgan: 'OrganB', program });

      const rtA = new CellRuntime(program, {
        activeCells: resolveTargetCells(program, 'OrganA'),
        nervousFabric: fabricA,
        localOrgan: 'OrganA',
      });
      const rtB = new CellRuntime(program, {
        activeCells: resolveTargetCells(program, 'OrganB'),
        nervousFabric: fabricB,
        localOrgan: 'OrganB',
      });

      rtA.send('Start', { tag: 'redis-integration' });
      const ingress = await rtB.pollNervous();
      assert.ok(
        ingress.some(t => t.from === 'PingCellB' && t.signal.type === 'DoneB'),
        'OrganB should consume nervous ingress from Redis',
      );

      const streamEntries = await client.xRange(nervousStreamKey('OrganB'));
      assert.ok(streamEntries.length >= 1);
    } finally {
      await client.close();
    }
  });
});
