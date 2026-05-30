// ═══════════════════════════════════════════════════════════
//  Cell Coding — Cloud runtime HTTP server (Phase 4)
//  organ-scoped signal ingress · distributed nervous · POST /v1/signals
// ═══════════════════════════════════════════════════════════

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';
import { resolveTargetCells } from './cell-lab.js';
import { buildViewerInspectSnapshot } from './viewer-inspect.js';
import {
  traceToOtelPayload,
  shouldExportOtel,
  shouldPushOtelToCollector,
  pushOtelTraces,
} from './otel-export.js';
import {
  RedisStreamsSignalBus,
  InMemoryRedisStreamsClient,
  type RedisStreamsClient,
} from './signal-bus-streams.js';
import { createRedisStreamsClient } from './redis-streams-client.js';
import {
  extractDividePolicies,
  dividePoliciesForOrgan,
  recommendReplicas,
  recommendReplicasAsync,
  DivideBalancer,
} from './cell-divide.js';
import { createDivideCoordinator, type DivideCoordinator } from './divide-coordinator.js';
import { NervousFabric } from './nervous-fabric.js';
import { formatPrometheusMetrics, shouldExposePrometheusMetrics } from './cell-metrics.js';
import type { SignalInstance, TraceEntry } from './runtime.js';
import type { SignalBusAdapter } from './signal-bus.js';
import type { Program } from './ast.js';

export interface CloudServeOptions {
  programFile: string;
  organ?: string;
  port?: number;
  host?: string;
}

export interface CloudServeHandle {
  port: number;
  close(): Promise<void>;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString('utf-8').trim();
  if (!text) return {};
  return JSON.parse(text);
}

function sendText(res: ServerResponse, status: number, body: string, contentType: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  sendText(res, status, JSON.stringify(body), 'application/json; charset=utf-8');
}

let sharedMockClient: InMemoryRedisStreamsClient | null = null;

function getSharedMockClient(): InMemoryRedisStreamsClient {
  if (!sharedMockClient) sharedMockClient = new InMemoryRedisStreamsClient();
  return sharedMockClient;
}

/** 테스트 간 Streams 공유 리셋 */
export function resetSharedMockRedisClient(): void {
  sharedMockClient = null;
  void import('./divide-coordinator.js').then(m => m.resetSharedMockDivideCoordinator());
}

async function createStreamsClient(): Promise<{
  client?: RedisStreamsClient & { close?(): Promise<void> };
  redisConnected: boolean;
}> {
  if (process.env.CELL_REDIS_MOCK === '1') {
    return { client: getSharedMockClient(), redisConnected: true };
  }

  const url = process.env.CELL_REDIS_URL;
  if (!url) return { redisConnected: false };

  try {
    const client = await createRedisStreamsClient(url);
    return { client, redisConnected: true };
  } catch {
    return { client: new InMemoryRedisStreamsClient(), redisConnected: false };
  }
}

function nervousEnabled(organ?: string): boolean {
  if (!organ) return false;
  const flag = process.env.CELL_NERVOUS?.toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no') return false;
  return Boolean(process.env.CELL_REDIS_URL || process.env.CELL_REDIS_MOCK === '1');
}

/** Start HTTP cloud runtime server · HTTP 클라우드 런타임 서버 시작 */
export async function startCloudServe(opts: CloudServeOptions): Promise<CloudServeHandle> {
  const programFile = resolve(opts.programFile);
  if (!existsSync(programFile)) {
    throw new Error(`Program not found · program 없음: ${programFile}`);
  }

  const source = readFileSync(programFile, 'utf-8');
  const { program, diagnostics } = compile(source);
  const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  if (errors.length) {
    throw new Error(errors.join('; '));
  }

  const organ = opts.organ ?? process.env.CELL_ORGAN;
  let activeCells: string[] | undefined;
  if (organ) {
    activeCells = resolveTargetCells(program, organ);
  }

  const inspect = buildViewerInspectSnapshot(program, diagnostics);
  const dividePolicies = organ
    ? dividePoliciesForOrgan(extractDividePolicies(program), organ)
    : extractDividePolicies(program);

  const replicaIndex =
    process.env.CELL_REPLICA_INDEX !== undefined ? Number(process.env.CELL_REPLICA_INDEX) : undefined;
  const replicaCount =
    process.env.CELL_REPLICA_COUNT !== undefined ? Number(process.env.CELL_REPLICA_COUNT) : undefined;
  const divideShared = process.env.CELL_DIVIDE_SHARED !== '0';

  let divideCoordinator: DivideCoordinator | undefined;
  if (organ && replicaCount && divideShared) {
    divideCoordinator = await createDivideCoordinator(
      process.env.CELL_REDIS_URL,
      process.env.CELL_REDIS_MOCK === '1',
    );
  }

  const signalStream = process.env.CELL_SIGNAL_STREAM ?? 'cell:signals';
  const { client, redisConnected } = await createStreamsClient();
  let closeExtra: (() => Promise<void>) | undefined;
  if (client && 'close' in client && typeof client.close === 'function') {
    closeExtra = () => client.close!();
  }
  if (divideCoordinator && 'close' in divideCoordinator) {
    const prev = closeExtra;
    closeExtra = async () => {
      if (prev) await prev();
      await (divideCoordinator as { close(): Promise<void> }).close();
    };
  }

  let bus: SignalBusAdapter | undefined;
  let nervousFabric: NervousFabric | undefined;
  if (client) {
    bus = new RedisStreamsSignalBus(client, signalStream);
    if (nervousEnabled(organ)) {
      nervousFabric = new NervousFabric({
        client,
        localOrgan: organ!,
        program,
      });
    }
  }

  const runtime = new CellRuntime(program, {
    activeCells,
    signalBus: bus,
    nervousFabric,
    localOrgan: organ,
  });

  let lastQueueDepth = 0;
  let lastNervousTrace: TraceEntry[] = [];
  const divideBalancer = new DivideBalancer();
  const pollMs = Number(process.env.CELL_NERVOUS_POLL_MS ?? 0);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const pollNervousOnce = async (): Promise<void> => {
    if (!nervousFabric) return;
    lastNervousTrace = await runtime.pollNervous();
    await syncQueueDepth();
  };

  const syncQueueDepth = async (): Promise<void> => {
    lastQueueDepth = bus?.size() ?? 0;
    if (divideCoordinator && organ && replicaIndex !== undefined) {
      await divideCoordinator.setReplicaQueueDepth(organ, replicaIndex, lastQueueDepth);
    }
  };

  const effectiveQueueDepth = async (): Promise<number> => {
    if (divideCoordinator && organ && replicaCount) {
      return divideCoordinator.aggregateQueueDepth(organ, replicaCount);
    }
    return lastQueueDepth;
  };

  const divideSnapshot = async (recordRoute = false) => {
    const depth = await effectiveQueueDepth();
    if (divideCoordinator && organ && replicaCount) {
      return recommendReplicasAsync(dividePolicies, depth, {
        coordinator: divideCoordinator,
        organ,
        replicaCount,
        recordRoute,
      });
    }
    return recommendReplicas(dividePolicies, depth, { balancer: divideBalancer, recordRoute });
  };

  if (nervousFabric && pollMs > 0) {
    pollTimer = setInterval(() => {
      void pollNervousOnce();
    }, pollMs);
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

      if (req.method === 'GET' && url.pathname === '/health') {
        await pollNervousOnce();
        if (!nervousFabric) await syncQueueDepth();
        sendJson(res, 200, {
          ok: true,
          organ: organ ?? null,
          cells: activeCells?.length ?? inspect.stats.cellCount,
          redis: redisConnected,
          nervous: nervousFabric ? await nervousFabric.stats() : null,
          queueDepth: await effectiveQueueDepth(),
          replicaIndex: replicaIndex ?? null,
          replicaCount: replicaCount ?? null,
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/organ') {
        sendJson(res, 200, { inspect, organ, activeCells });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/nervous') {
        await pollNervousOnce();
        sendJson(res, 200, {
          ok: true,
          stats: nervousFabric ? await nervousFabric.stats() : null,
          lastIngressTrace: lastNervousTrace,
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/metrics' && shouldExposePrometheusMetrics()) {
        await pollNervousOnce();
        if (!nervousFabric) await syncQueueDepth();
        const depth = await effectiveQueueDepth();
        const divide = await divideSnapshot();
        sendText(
          res,
          200,
          formatPrometheusMetrics({
            organ: organ ?? undefined,
            replica: replicaIndex,
            queueDepth: depth,
            divide,
            nervous: nervousFabric ? await nervousFabric.stats() : null,
          }),
          'text/plain; version=0.0.4; charset=utf-8',
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/metrics') {
        if (!nervousFabric) await syncQueueDepth();
        sendJson(res, 200, {
          ok: true,
          queueDepth: await effectiveQueueDepth(),
          divide: await divideSnapshot(),
          nervous: nervousFabric ? await nervousFabric.stats() : null,
          otel: shouldExportOtel(),
          replicaIndex: replicaIndex ?? null,
          replicaCount: replicaCount ?? null,
        });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/signals') {
        const body = (await readJsonBody(req)) as { type?: string; data?: Record<string, unknown> };
        if (!body.type) {
          sendJson(res, 400, { ok: false, error: 'Missing signal type · type 필수' });
          return;
        }

        await pollNervousOnce();
        if (!nervousFabric) await syncQueueDepth();

        const dividePlan = await divideSnapshot(true);
        const targetReplica = dividePlan[0]?.targetReplica;
        if (
          replicaIndex !== undefined &&
          targetReplica !== undefined &&
          targetReplica !== replicaIndex
        ) {
          sendJson(res, 200, {
            ok: true,
            skipped: true,
            reason: 'replica-mismatch',
            replicaIndex,
            targetReplica,
            divide: dividePlan,
            queueDepth: await effectiveQueueDepth(),
          });
          return;
        }

        const input: SignalInstance = { type: body.type, data: body.data ?? {} };
        const trace = runtime.send(input.type, input.data);
        await pollNervousOnce();
        if (!nervousFabric) await syncQueueDepth();

        const payload: Record<string, unknown> = {
          ok: true,
          input,
          trace,
          nervousIngress: lastNervousTrace,
          nervous: nervousFabric ? await nervousFabric.stats() : null,
          lifecycle: runtime.getLifecycleSnapshot(),
          deadLetters: runtime.getDeadLetters(),
          queueDepth: await effectiveQueueDepth(),
          divide: dividePlan,
          replicaIndex: replicaIndex ?? null,
        };
        if (shouldExportOtel()) {
          payload.otel = traceToOtelPayload(trace, {
            serviceName: organ ? `cell-organ-${organ}` : 'cell-runtime',
          });
        }
        if (shouldPushOtelToCollector()) {
          const otelPayload = traceToOtelPayload(trace, {
            serviceName: organ ? `cell-organ-${organ}` : 'cell-runtime',
          });
          try {
            await pushOtelTraces(otelPayload);
          } catch (e) {
            console.error('[cell-otel]', e instanceof Error ? e.message : String(e));
          }
        }

        sendJson(res, 200, payload);
        return;
      }

      sendJson(res, 404, { ok: false, error: 'Not found' });
    } catch (e) {
      sendJson(res, 500, {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });

  const port = opts.port ?? Number(process.env.CELL_PORT ?? 8080);
  const host = opts.host ?? process.env.CELL_HOST ?? '0.0.0.0';

  return new Promise((resolvePromise, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const boundPort = typeof addr === 'object' && addr ? addr.port : port;
      resolvePromise({
        port: boundPort,
        close: async () => {
          if (pollTimer) clearInterval(pollTimer);
          await new Promise<void>((resolveClose, rejectClose) => {
            server.close(err => (err ? rejectClose(err) : resolveClose()));
          });
          if (closeExtra) await closeExtra();
        },
      });
    });
  });
}

export type { Program as CloudServeProgram };
