// ═══════════════════════════════════════════════════════════
//  Cell Coding — Divide gateway (Phase 4+)
//  shared coordinator → upstream replica forward
// ═══════════════════════════════════════════════════════════

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from './compile.js';
import {
  extractDividePolicies,
  dividePoliciesForOrgan,
  recommendReplicasAsync,
  type DividePolicy,
} from './cell-divide.js';
import type { DivideCoordinator } from './divide-coordinator.js';
import { createDivideCoordinator } from './divide-coordinator.js';
import { formatPrometheusMetrics, shouldExposePrometheusMetrics } from './cell-metrics.js';

export interface DivideGatewayOptions {
  organ: string;
  upstreams: string[];
  redisUrl?: string;
  coordinator?: DivideCoordinator;
  programFile?: string;
  port?: number;
  host?: string;
}

export interface DivideGatewayHandle {
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

function loadPolicies(programFile: string | undefined, organ: string): DividePolicy[] {
  if (!programFile) return [];
  const file = resolve(programFile);
  if (!existsSync(file)) return [];
  const { program } = compile(readFileSync(file, 'utf-8'));
  return dividePoliciesForOrgan(extractDividePolicies(program), organ);
}

/** divide gateway · replica 선택 후 upstream forward */
export async function startDivideGateway(opts: DivideGatewayOptions): Promise<DivideGatewayHandle> {
  const upstreams = opts.upstreams.map(u => u.replace(/\/$/, ''));
  if (!upstreams.length) {
    throw new Error('CELL_DIVIDE_UPSTREAMS required · upstream URL 필요');
  }

  const coordinator =
    opts.coordinator ??
    (await createDivideCoordinator(
      opts.redisUrl,
      process.env.CELL_REDIS_MOCK === '1',
    ));
  if (!coordinator) {
    throw new Error('Redis coordinator required · CELL_REDIS_URL 필요');
  }

  const policies = loadPolicies(opts.programFile, opts.organ);
  const replicaCount = upstreams.length;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, {
          ok: true,
          role: 'divide-gateway',
          organ: opts.organ,
          upstreams: upstreams.length,
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/metrics' && shouldExposePrometheusMetrics()) {
        const queueDepth = await coordinator.aggregateQueueDepth(opts.organ, replicaCount);
        const divide = await recommendReplicasAsync(policies, queueDepth, {
          coordinator,
          organ: opts.organ,
          replicaCount,
          recordRoute: false,
        });
        sendText(
          res,
          200,
          formatPrometheusMetrics({ organ: opts.organ, queueDepth, divide }),
          'text/plain; version=0.0.4; charset=utf-8',
        );
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/signals') {
        const body = (await readJsonBody(req)) as { type?: string; data?: Record<string, unknown> };
        if (!body.type) {
          sendJson(res, 400, { ok: false, error: 'Missing signal type · type 필수' });
          return;
        }

        const queueDepth = await coordinator.aggregateQueueDepth(opts.organ, replicaCount);
        const divide = await recommendReplicasAsync(policies, queueDepth, {
          coordinator,
          organ: opts.organ,
          replicaCount,
          recordRoute: true,
        });

        const target = divide[0]?.targetReplica ?? 0;
        const upstream = upstreams[target] ?? upstreams[0];
        const forward = await fetch(`${upstream}/v1/signals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cell-Target-Replica': String(target),
          },
          body: JSON.stringify({ type: body.type, data: body.data ?? {} }),
        });

        const payload = (await forward.json()) as Record<string, unknown>;
        sendJson(res, forward.status, {
          ...payload,
          gateway: {
            organ: opts.organ,
            targetReplica: target,
            upstream,
            aggregateQueueDepth: queueDepth,
          },
          divide,
        });
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
          await new Promise<void>((resolveClose, rejectClose) => {
            server.close(err => (err ? rejectClose(err) : resolveClose()));
          });
          if (coordinator && 'close' in coordinator) {
            await (coordinator as { close(): Promise<void> }).close();
          }
        },
      });
    });
  });
}
