import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { resolveTargetCells } from './cell-lab.js';
import { InMemoryRedisStreamsClient } from './signal-bus-streams.js';
import { NervousFabric, nervousStreamKey } from './nervous-fabric.js';
import { startCloudServe, resetSharedMockRedisClient } from './cloud-serve.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routedSource = readFileSync(join(__dirname, 'fixtures/routed-organs.cell'), 'utf-8');

function runtimePair(client: InMemoryRedisStreamsClient) {
  const { program, diagnostics } = compile(routedSource);
  assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);

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

  return { rtA, rtB, fabricA, fabricB, program };
}

describe('NervousFabric', () => {
  it('publishes cross-organ deliveries to target stream', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { fabricA } = runtimePair(client);

    fabricA.publishCrossOrgan(
      'PingCellA',
      { type: 'SharedPing', data: { payload: 'hi' } },
      () => true,
    );

    const entries = await client.xRange(nervousStreamKey('OrganB'));
    assert.equal(entries.length, 1);
    assert.equal(entries[0].fields.target, 'OrganB');
    assert.equal(entries[0].fields.source, 'OrganA');
  });

  it('does not publish to local organ only delivery', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { fabricB } = runtimePair(client);

    fabricB.publishCrossOrgan(
      'PingCellB',
      { type: 'DoneB', data: { ok: true } },
      () => true,
    );

    const entries = await client.xRange(nervousStreamKey('OrganA'));
    assert.equal(entries.length, 0);
  });
});

describe('distributed nervous runtime', () => {
  it('routes OrganA.SharedPing to OrganB via Redis Streams', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { rtA, rtB } = runtimePair(client);

    const traceA = rtA.send('Start', { tag: 'distributed' });
    assert.ok(traceA.some(t => t.from === 'PingCellA' && t.signal.type === 'SharedPing'));
    assert.equal(
      traceA.some(t => t.signal.type === 'DoneB'),
      false,
      'OrganA must not execute OrganB handlers',
    );

    const ingressTrace = await rtB.pollNervous();
    assert.ok(
      ingressTrace.some(t => t.from === 'PingCellB' && t.signal.type === 'DoneB'),
      'OrganB should handle nervous ingress',
    );
  });

  it('respects nervous when-condition across organs', async () => {
    const conditionalSource = readFileSync(join(__dirname, 'fixtures/conditional-organs.cell'), 'utf-8');
    const { program } = compile(conditionalSource);
    const client = new InMemoryRedisStreamsClient();
    const fabricA = new NervousFabric({ client, localOrgan: 'OrganA', program });
    const fabricB = new NervousFabric({ client, localOrgan: 'OrganB', program });
    const rtA = new CellRuntime(program, {
      activeCells: resolveTargetCells(program, 'OrganA'),
      nervousFabric: fabricA,
    });
    const rtB = new CellRuntime(program, {
      activeCells: resolveTargetCells(program, 'OrganB'),
      nervousFabric: fabricB,
    });

    rtA.send('Start', { tag: 'skip' });
    let ingress = await rtB.pollNervous();
    assert.equal(ingress.length, 0);

    rtA.send('Start', { tag: 'route' });
    ingress = await rtB.pollNervous();
    assert.ok(ingress.some(t => t.signal.type === 'DoneB'));
  });
});

describe('Redis Consumer Group ingress', () => {
  it('does not redeliver unacked messages on second XREADGROUP', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { rtA, fabricB } = runtimePair(client);
    const stream = nervousStreamKey('OrganB');

    rtA.send('Start', { tag: 'once' });
    const first = await fabricB.drainIngress();
    assert.equal(first.length, 1);
    assert.equal(await client.xPendingCount(stream, 'cell-nervous'), 1);

    const second = await fabricB.drainIngress();
    assert.equal(second.length, 0);

    await fabricB.ackIngress(first[0].stream, first[0].streamId);
    assert.equal(await client.xPendingCount(stream, 'cell-nervous'), 0);
  });

  it('pollNervous acks after successful handler run', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { rtA, rtB, fabricB } = runtimePair(client);

    rtA.send('Start', { tag: 'ack-test' });
    await rtB.pollNervous();

    const stats = fabricB.statsSync();
    assert.equal(stats.consumed, 1);
    assert.equal(stats.acked, 1);
    assert.equal(await client.xPendingCount(nervousStreamKey('OrganB'), 'cell-nervous'), 0);
  });

  it('load-balances across consumers in the same group', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { program } = compile(routedSource);
    const fabricA = new NervousFabric({ client, localOrgan: 'OrganA', program });
    const fabricB1 = new NervousFabric({
      client,
      localOrgan: 'OrganB',
      program,
      consumerName: 'worker-1',
    });
    const fabricB2 = new NervousFabric({
      client,
      localOrgan: 'OrganB',
      program,
      consumerName: 'worker-2',
    });

    fabricA.publishCrossOrgan('PingCellA', { type: 'SharedPing', data: {} }, () => true);
    fabricA.publishCrossOrgan('PingCellA', { type: 'SharedPing', data: {} }, () => true);

    const a = await fabricB1.drainIngress(1);
    const b = await fabricB2.drainIngress(1);
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
  });
});

describe('Redis XAUTOCLAIM ingress', () => {
  it('reclaims stuck unacked messages to another consumer', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { rtA, program } = runtimePair(client);
    const fabricStuck = new NervousFabric({
      client,
      localOrgan: 'OrganB',
      program,
      consumerName: 'worker-stuck',
      autoClaimMinIdleMs: 0,
    });
    const fabricRescue = new NervousFabric({
      client,
      localOrgan: 'OrganB',
      program,
      consumerName: 'worker-rescue',
      autoClaimMinIdleMs: 0,
    });
    const rtRescue = new CellRuntime(program, {
      activeCells: resolveTargetCells(program, 'OrganB'),
      nervousFabric: fabricRescue,
      localOrgan: 'OrganB',
    });

    rtA.send('Start', { tag: 'stuck' });
    const stuck = await fabricStuck.drainIngress();
    assert.equal(stuck.length, 1);
    assert.equal(await client.xPendingCount(nervousStreamKey('OrganB'), 'cell-nervous'), 1);

    const trace = await rtRescue.pollNervous();
    assert.ok(trace.some(t => t.from === 'PingCellB' && t.signal.type === 'DoneB'));
    assert.equal(fabricRescue.statsSync().reclaimed, 1);
    assert.equal(fabricRescue.statsSync().acked, 1);
    assert.equal(await client.xPendingCount(nervousStreamKey('OrganB'), 'cell-nervous'), 0);
  });

  it('skips autoclaim when idle threshold not met', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { rtA, program } = runtimePair(client);
    const fabricStuck = new NervousFabric({
      client,
      localOrgan: 'OrganB',
      program,
      consumerName: 'worker-stuck',
    });
    const fabricRescue = new NervousFabric({
      client,
      localOrgan: 'OrganB',
      program,
      consumerName: 'worker-rescue',
      autoClaimMinIdleMs: 60_000,
    });

    rtA.send('Start', { tag: 'not-yet' });
    await fabricStuck.drainIngress();

    const reclaimed = await fabricRescue.autoClaimIngress();
    assert.equal(reclaimed.length, 0);
    assert.equal(await client.xPendingCount(nervousStreamKey('OrganB'), 'cell-nervous'), 1);
  });

  it('respects CELL_NERVOUS_AUTOCLAIM=0', async () => {
    const client = new InMemoryRedisStreamsClient();
    const { rtA, program } = runtimePair(client);
    const prev = process.env.CELL_NERVOUS_AUTOCLAIM;
    process.env.CELL_NERVOUS_AUTOCLAIM = '0';

    try {
      const fabricStuck = new NervousFabric({
        client,
        localOrgan: 'OrganB',
        program,
        consumerName: 'worker-stuck',
      });
      const fabricRescue = new NervousFabric({
        client,
        localOrgan: 'OrganB',
        program,
        consumerName: 'worker-rescue',
        autoClaimMinIdleMs: 0,
      });

      rtA.send('Start', { tag: 'disabled' });
      await fabricStuck.drainIngress();

      const reclaimed = await fabricRescue.autoClaimIngress(0);
      assert.equal(reclaimed.length, 0);
    } finally {
      if (prev === undefined) delete process.env.CELL_NERVOUS_AUTOCLAIM;
      else process.env.CELL_NERVOUS_AUTOCLAIM = prev;
    }
  });
});

describe('cloud-serve distributed nervous', () => {
  it('OrganA publish + OrganB poll over HTTP', async () => {
    const prevMock = process.env.CELL_REDIS_MOCK;
    process.env.CELL_REDIS_MOCK = '1';
    resetSharedMockRedisClient();

    const organA = await startCloudServe({
      programFile: join(__dirname, 'fixtures/routed-organs.cell'),
      organ: 'OrganA',
      port: 0,
      host: '127.0.0.1',
    });
    const organB = await startCloudServe({
      programFile: join(__dirname, 'fixtures/routed-organs.cell'),
      organ: 'OrganB',
      port: 0,
      host: '127.0.0.1',
    });

    try {
      const resA = await fetch(`http://127.0.0.1:${organA.port}/v1/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Start', data: { tag: 'cloud' } }),
      });
      assert.equal(resA.status, 200);
      const bodyA = (await resA.json()) as { trace: Array<{ signal: { type: string } }> };
      assert.ok(bodyA.trace.some(t => t.signal.type === 'SharedPing'));

      const resB = await fetch(`http://127.0.0.1:${organB.port}/v1/nervous`);
      assert.equal(resB.status, 200);
      const bodyB = (await resB.json()) as {
        lastIngressTrace: Array<{ signal: { type: string } }>;
        stats: { consumed: number; acked: number; consumerGroup: string };
      };
      assert.ok(bodyB.stats.consumed >= 1);
      assert.ok(bodyB.stats.acked >= 1);
      assert.equal(bodyB.stats.consumerGroup, 'cell-nervous');
      assert.ok(bodyB.lastIngressTrace.some(t => t.signal.type === 'DoneB'));
    } finally {
      await organA.close();
      await organB.close();
      if (prevMock === undefined) delete process.env.CELL_REDIS_MOCK;
      else process.env.CELL_REDIS_MOCK = prevMock;
    }
  });
});
