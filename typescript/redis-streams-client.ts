// ═══════════════════════════════════════════════════════════
//  Cell Coding — ioredis Streams client (Phase 4+)
//  CELL_REDIS_URL → Redis Streams XADD/XRANGE
// ═══════════════════════════════════════════════════════════

import Redis from 'ioredis';
import type { RedisStreamsClient, StreamEntry } from './signal-bus-streams.js';

function rowsToEntries(rows: [string, string[]][]): StreamEntry[] {
  return rows.map(([id, arr]) => {
    const fields: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) {
      fields[arr[i]] = arr[i + 1];
    }
    return { id, fields };
  });
}

/** ioredis 기반 Streams 클라이언트 생성 */
export async function createRedisStreamsClient(url: string): Promise<RedisStreamsClient & { close(): Promise<void> }> {
  const redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
  await redis.connect();

  return {
    xAdd(stream: string, fields: Record<string, string>) {
      const args: string[] = [];
      for (const [k, v] of Object.entries(fields)) {
        args.push(k, v);
      }
      return redis.xadd(stream, '*', ...args);
    },
    async xRange(stream: string, start = '-', end = '+') {
      const rows = await redis.xrange(stream, start, end);
      return rowsToEntries(rows);
    },
    async xReadAfter(stream: string, lastId: string, count = 100) {
      const startId = !lastId || lastId === '0' ? '-' : `(${lastId}`;
      const rows = await redis.xrange(stream, startId, '+', 'COUNT', count);
      return rowsToEntries(rows);
    },
    async xGroupCreate(stream: string, group: string, id = '0', mkStream = false) {
      try {
        const args: (string | number)[] = ['CREATE', stream, group, id];
        if (mkStream) args.push('MKSTREAM');
        await redis.xgroup(...args);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('BUSYGROUP')) throw e;
      }
    },
    async xReadGroup(stream: string, group: string, consumer: string, count = 100) {
      const rows = await redis.xreadgroup(
        'GROUP',
        group,
        consumer,
        'COUNT',
        count,
        'STREAMS',
        stream,
        '>',
      );
      if (!rows || !rows[0]) return [];
      const [, entries] = rows[0] as [string, [string, string[]][]];
      return rowsToEntries(entries);
    },
    async xAck(stream: string, group: string, ...ids: string[]) {
      if (!ids.length) return 0;
      return redis.xack(stream, group, ...ids);
    },
    async xPendingCount(stream: string, group: string) {
      const summary = await redis.xpending(stream, group);
      if (!summary || typeof summary !== 'object') return 0;
      if (Array.isArray(summary)) return Number(summary[0] ?? 0);
      return Number((summary as { count?: number }).count ?? 0);
    },
    async xAutoClaim(
      stream: string,
      group: string,
      consumer: string,
      minIdleMs: number,
      startId = '0-0',
      count = 100,
    ) {
      const raw = await redis.xautoclaim(stream, group, consumer, minIdleMs, startId, 'COUNT', count);
      if (!raw || !Array.isArray(raw)) {
        return { entries: [], nextStart: '0-0' };
      }
      const nextStart = String(raw[0] ?? '0-0');
      const rows = (raw[1] ?? []) as [string, string[]][];
      return { entries: rowsToEntries(rows), nextStart };
    },
    async close() {
      await redis.quit();
    },
  };
}
