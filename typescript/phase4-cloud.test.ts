import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { startCloudServe } from './cloud-serve.js';
import { traceToOtelPayload, shouldExportOtel } from './otel-export.js';
import {
  InMemoryRedisStreamsClient,
  RedisStreamsSignalBus,
  sortStreamEntries,
} from './signal-bus-streams.js';
import { syncRemoteRegistry } from './registry-remote.js';
import { installPackage } from './cell-registry.js';
import { compile } from './compile.js';
import { CellRuntime } from './runtime.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryRoot = join(__dirname, '..', 'registry');
const authOrganCell = join(registryRoot, 'packages/community/auth-organ/auth-organ.cell');

function startRegistryStaticServer(root: string): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolvePromise, reject) => {
    const server: Server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const rel = decodeURIComponent(url.pathname.replace(/^\//, ''));
        const filePath = join(root, rel);
        if (!filePath.startsWith(root) || !existsSync(filePath)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        const body = readFileSync(filePath);
        res.setHeader('Content-Type', rel.endsWith('.json') ? 'application/json' : 'text/plain');
        res.end(body);
      } catch (e) {
        res.statusCode = 500;
        res.end(String(e));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolvePromise({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolveClose, rejectClose) => server.close(err => (err ? rejectClose(err) : resolveClose()))),
      });
    });
    server.on('error', reject);
  });
}

describe('OTel export', () => {
  it('converts trace entries to OTel spans', () => {
    const payload = traceToOtelPayload(
      [
        { from: 'external', signal: { type: 'AuthRequest', data: { token: 'x' } }, atMs: 0 },
        { from: 'TokenValidateCell', signal: { type: 'AuthGranted', data: { userId: '1' } }, atMs: 1 },
      ],
      { serviceName: 'auth-organ' },
    );
    assert.equal(payload.resourceSpans[0].scopeSpans[0].spans.length, 2);
    assert.equal(payload.resourceSpans[0].resource.attributes[0].value.stringValue, 'auth-organ');
  });

  it('shouldExportOtel respects CELL_OTEL', () => {
    const prev = process.env.CELL_OTEL;
    process.env.CELL_OTEL = 'true';
    assert.equal(shouldExportOtel(), true);
    process.env.CELL_OTEL = '0';
    assert.equal(shouldExportOtel(), false);
    if (prev === undefined) delete process.env.CELL_OTEL;
    else process.env.CELL_OTEL = prev;
  });

  it('pushOtelTraces posts OTLP JSON to collector endpoint', async () => {
    const { createServer } = await import('node:http');
    const { pushOtelTraces, shouldPushOtelToCollector } = await import('./otel-export.js');
    let received = '';
    const server = createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v1/traces') {
        req.on('data', chunk => {
          received += chunk;
        });
        req.on('end', () => {
          res.writeHead(200);
          res.end('{}');
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const payload = traceToOtelPayload([{ from: 'external', signal: { type: 'Ping', data: {} } }]);
    await pushOtelTraces(payload, `http://127.0.0.1:${port}/v1/traces`);
    assert.ok(received.includes('resourceSpans'));
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));

    const prev = process.env.CELL_OTEL_EXPORT;
    process.env.CELL_OTEL_EXPORT = 'otlp';
    assert.equal(shouldPushOtelToCollector(), true);
    if (prev === undefined) delete process.env.CELL_OTEL_EXPORT;
    else process.env.CELL_OTEL_EXPORT = prev;
  });
});

describe('Redis Streams signal bus', () => {
  it('xAdds on enqueue and drains locally', () => {
    const client = new InMemoryRedisStreamsClient();
    const bus = new RedisStreamsSignalBus(client, 'test:stream');
    bus.enqueue({
      signal: { type: 'Ping', data: {} },
      priority: 'high',
      seq: 1,
    });
    assert.equal(bus.size(), 1);
    const msg = bus.dequeue();
    assert.equal(msg?.signal.type, 'Ping');
  });

  it('sortStreamEntries by priority then seq', async () => {
    const client = new InMemoryRedisStreamsClient();
    client.xAdd('s', {
      payload: JSON.stringify({ signal: { type: 'A', data: {} }, priority: 'normal', seq: 2 }),
      priority: 'normal',
    });
    client.xAdd('s', {
      payload: JSON.stringify({ signal: { type: 'B', data: {} }, priority: 'critical', seq: 1 }),
      priority: 'critical',
    });
    const sorted = sortStreamEntries(await client.xRange('s'));
    assert.equal(sorted[0].signal.type, 'B');
  });
});

describe('cloud-serve HTTP', () => {
  let handle: Awaited<ReturnType<typeof startCloudServe>>;

  after(async () => {
    if (handle) await handle.close();
  });

  it('GET /health and POST /v1/signals for AuthOrgan', async () => {
    const prevMock = process.env.CELL_REDIS_MOCK;
    process.env.CELL_REDIS_MOCK = '1';
    handle = await startCloudServe({
      programFile: authOrganCell,
      organ: 'AuthOrgan',
      port: 0,
      host: '127.0.0.1',
    });

    const base = `http://127.0.0.1:${handle.port}`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const healthJson = (await health.json()) as { ok: boolean; organ: string };
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.organ, 'AuthOrgan');

    const prevOtel = process.env.CELL_OTEL;
    process.env.CELL_OTEL = 'true';
    const res = await fetch(`${base}/v1/signals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'AuthRequest', data: { token: 'valid-token' } }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; otel?: { resourceSpans: unknown[] } };
    assert.equal(body.ok, true);
    assert.ok(body.otel?.resourceSpans);
    if (prevOtel === undefined) delete process.env.CELL_OTEL;
    else process.env.CELL_OTEL = prevOtel;
    if (prevMock === undefined) delete process.env.CELL_REDIS_MOCK;
    else process.env.CELL_REDIS_MOCK = prevMock;
  });
});

describe('remote registry sync + install', () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'cell-remote-reg-'));
  const projectDir = mkdtempSync(join(tmpdir(), 'cell-remote-proj-'));
  let staticServer: Awaited<ReturnType<typeof startRegistryStaticServer>>;

  after(async () => {
    if (staticServer) await staticServer.close();
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('syncs from HTTP registry and installs package', async () => {
    staticServer = await startRegistryStaticServer(registryRoot);
    const synced = await syncRemoteRegistry(staticServer.baseUrl, cacheDir);
    assert.ok(existsSync(join(synced, 'index.json')));
    assert.ok(existsSync(join(synced, 'packages/community/auth-organ/auth-organ.cell')));

    mkdirSync(join(projectDir, 'cells'), { recursive: true });
    writeFileSync(
      join(projectDir, 'cell.config.json'),
      JSON.stringify({ version: 1, name: 'remote-test', entry: 'cells/main.cell' }, null, 2),
    );
    writeFileSync(join(projectDir, 'cells/main.cell'), readFileSync(authOrganCell, 'utf-8'));

    const result = installPackage({
      projectDir,
      packageRef: '@community/auth-organ',
      registryRoot: synced,
    });
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.ok(existsSync(join(result.vendorPath, 'auth-organ.cell')));
  });
});

describe('runtime with RedisStreamsSignalBus', () => {
  it('runs program with streams bus adapter', () => {
    const source = readFileSync(authOrganCell, 'utf-8');
    const { program } = compile(source);
    const bus = new RedisStreamsSignalBus(new InMemoryRedisStreamsClient());
    const runtime = new CellRuntime(program, { signalBus: bus, activeCells: ['TokenValidateCell'] });
    const trace = runtime.send('AuthRequest', { token: 'valid-token' });
    assert.ok(trace.some(t => t.signal.type === 'AuthGranted'));
  });
});
