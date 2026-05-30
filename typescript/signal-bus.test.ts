import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemorySignalBus,
  InMemoryRedisLikeClient,
  RedisSignalBusAdapter,
  freezeSignal,
} from './signal-bus.js';
import {
  buildSignalPriorityMap,
  priorityForType,
  priorityRank,
} from './signal-priority.js';
import { compile } from './compile.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const spongeSource = readFileSync(
  join(__dirname, '../examples/porifera-filter/sponge-organism.cell'),
  'utf-8',
);

describe('signal priority', () => {
  it('orders critical before low', () => {
    assert.ok(priorityRank('critical') < priorityRank('low'));
  });

  it('builds priority map from signal declarations', () => {
    const source = `
      signal Alert priority: critical { level: Number }
      signal Ping priority: low { tag: String }
    `;
    const { program } = compile(source);
    const map = buildSignalPriorityMap(program);
    assert.equal(priorityForType(map, 'Alert'), 'critical');
    assert.equal(priorityForType(map, 'Ping'), 'low');
    assert.equal(priorityForType(map, 'Unknown'), 'normal');
  });
});

describe('InMemorySignalBus', () => {
  it('dequeues higher priority first', () => {
    const bus = new InMemorySignalBus();
    bus.enqueue({
      signal: { type: 'Low', data: {} },
      from: 'A',
      priority: 'low',
      seq: 1,
    });
    bus.enqueue({
      signal: { type: 'Critical', data: {} },
      from: 'B',
      priority: 'critical',
      seq: 2,
    });
    assert.equal(bus.dequeue()?.signal.type, 'Critical');
    assert.equal(bus.dequeue()?.signal.type, 'Low');
  });

  it('freezes signal data on enqueue', () => {
    const data = { n: 1 };
    const frozen = freezeSignal({ type: 'T', data });
    data.n = 99;
    assert.equal(frozen.data.n, 1);
    assert.throws(() => {
      (frozen.data as Record<string, number>).n = 2;
    });
  });
});

describe('RedisSignalBusAdapter', () => {
  it('mirrors enqueue/dequeue through RedisLike client', () => {
    const client = new InMemoryRedisLikeClient();
    const bus = new RedisSignalBusAdapter(client, 'test:signals');
    bus.enqueue({
      signal: { type: 'Ping', data: { x: 1 } },
      from: 'CellA',
      priority: 'normal',
      seq: 1,
    });
    assert.equal(bus.size(), 1);
    const msg = bus.dequeue();
    assert.equal(msg?.signal.type, 'Ping');
    assert.equal(bus.size(), 0);
  });
});

describe('sponge program priorities', () => {
  it('loads sponge signal map without errors', () => {
    const { program, diagnostics } = compile(spongeSource);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
    const map = buildSignalPriorityMap(program);
    assert.ok(map.size >= 1);
  });
});
