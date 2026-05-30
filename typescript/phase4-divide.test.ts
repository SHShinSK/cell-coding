import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  extractDividePolicies,
  evalDivideCondition,
  recommendReplicas,
  organHpaSpec,
  extractQueueThreshold,
  DivideBalancer,
} from './cell-divide.js';
import { satisfiesRange, compareSemver } from './cell-semver.js';
import { deployCellFile } from './cell-deploy.js';
import { compile } from './compile.js';
import { startCloudServe } from './cloud-serve.js';
import { installPackage, resolveRegistryRoot } from './cell-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const divideFixture = join(__dirname, 'fixtures', 'divide-scale.cell');

describe('cell divide policies', () => {
  it('extracts WorkerCell divide when queue.depth > 10', () => {
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const policies = extractDividePolicies(program);
    assert.equal(policies.length, 1);
    assert.equal(policies[0].cellName, 'WorkerCell');
    assert.equal(policies[0].max, 4);
    assert.equal(policies[0].strategy, 'round-robin');
    assert.equal(extractQueueThreshold(policies[0].condition), 10);
  });

  it('evaluates divide condition from queue depth', () => {
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const policy = extractDividePolicies(program)[0];
    assert.equal(evalDivideCondition(policy.condition, 5), false);
    assert.equal(evalDivideCondition(policy.condition, 11), true);
  });

  it('recommends replicas up to max when scaling', () => {
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const policies = extractDividePolicies(program);
    const low = recommendReplicas(policies, 5);
    assert.equal(low[0].replicas, 1);
    assert.equal(low[0].shouldScale, false);

    const high = recommendReplicas(policies, 35);
    assert.equal(high[0].shouldScale, true);
    assert.equal(high[0].replicas, 4);
  });

  it('builds organ HPA spec for WorkerOrgan', () => {
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const spec = organHpaSpec(extractDividePolicies(program), 'WorkerOrgan');
    assert.ok(spec);
    assert.equal(spec!.maxReplicas, 4);
    assert.equal(spec!.targetQueueDepth, 10);
  });
});

describe('DivideBalancer strategies', () => {
  it('round-robin cycles replicas and dryRun does not advance', () => {
    const balancer = new DivideBalancer();
    assert.equal(balancer.pickReplica('round-robin', 4, { dryRun: true }), 0);
    assert.equal(balancer.pickReplica('round-robin', 4, { dryRun: true }), 0);
    assert.deepEqual(
      [0, 1, 2, 3, 0].map(() => balancer.pickReplica('round-robin', 4)),
      [0, 1, 2, 3, 0],
    );
  });

  it('least-loaded prefers lowest load replica', () => {
    const balancer = new DivideBalancer();
    balancer.setReplicaLoads([8, 2, 5]);
    assert.equal(balancer.pickReplica('least-loaded', 3), 1);
    balancer.recordDispatch(1, 4);
    assert.equal(balancer.pickReplica('least-loaded', 3), 2);
  });

  it('random uses injected rng', () => {
    let n = 0;
    const balancer = new DivideBalancer(() => {
      n = (n + 0.37) % 1;
      return n;
    });
    const a = balancer.pickReplica('random', 4);
    const b = balancer.pickReplica('random', 4);
    assert.notEqual(a, b);
    assert.ok(a >= 0 && a < 4);
    assert.ok(b >= 0 && b < 4);
  });

  it('recommendReplicas records route only when recordRoute=true', () => {
    const { program } = compile(readFileSync(divideFixture, 'utf-8'));
    const policies = extractDividePolicies(program);
    const balancer = new DivideBalancer();

    const peek = recommendReplicas(policies, 25, { balancer, recordRoute: false });
    const route = recommendReplicas(policies, 25, { balancer, recordRoute: true });

    assert.equal(peek[0].targetReplica, 0);
    assert.equal(route[0].targetReplica, 0);
    assert.equal(balancer.getReplicaLoad(0), 1);

    const next = recommendReplicas(policies, 25, { balancer, recordRoute: true });
    assert.equal(next[0].targetReplica, 1);
  });
});

describe('cell deploy HPA', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'cell-divide-deploy-'));

  after(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('includes HorizontalPodAutoscaler when divide policy exists', () => {
    const result = deployCellFile({ file: divideFixture, outDir });
    assert.equal(result.ok, true, result.errors.join('; '));
    const yaml = readFileSync(result.manifests[0], 'utf-8');
    assert.match(yaml, /kind: HorizontalPodAutoscaler/);
    assert.match(yaml, /maxReplicas: 4/);
    assert.match(yaml, /cell_signal_queue_depth/);
    assert.match(yaml, /prometheus.io\/scrape/);
    assert.match(yaml, /prometheus.io\/path: "\/metrics"/);
  });
});

describe('registry semver', () => {
  it('satisfies caret and exact ranges', () => {
    assert.equal(satisfiesRange('0.1.0', '^0.1.0'), true);
    assert.equal(satisfiesRange('0.2.0', '^0.1.0'), false);
    assert.equal(satisfiesRange('1.0.0', '^0.1.0'), false);
    assert.equal(satisfiesRange('0.1.5', '>=0.1.0'), true);
    assert.equal(compareSemver('0.1.1', '0.1.0'), 1);
  });

  it('rejects install when version range not satisfied', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'cell-semver-'));
    mkdirSync(join(projectDir, 'cells'), { recursive: true });
    writeFileSync(
      join(projectDir, 'cell.config.json'),
      JSON.stringify({ version: 1, name: 't', entry: 'cells/main.cell' }),
    );
    writeFileSync(join(projectDir, 'cells/main.cell'), readFileSync(divideFixture, 'utf-8'));

    const result = installPackage({
      projectDir,
      packageRef: '@community/auth-organ',
      registryRoot: resolveRegistryRoot(),
      versionRange: '^9.0.0',
    });
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /does not satisfy/);
    rmSync(projectDir, { recursive: true, force: true });
  });
});

describe('cloud-serve metrics', () => {
  let handle: Awaited<ReturnType<typeof startCloudServe>>;

  after(async () => {
    if (handle) await handle.close();
  });

  it('GET /v1/metrics returns divide recommendations', async () => {
    process.env.CELL_REDIS_MOCK = '1';
    handle = await startCloudServe({
      programFile: divideFixture,
      organ: 'WorkerOrgan',
      port: 0,
      host: '127.0.0.1',
    });

    const res = await fetch(`http://127.0.0.1:${handle.port}/v1/metrics`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { divide: Array<{ cell: string; max: number }> };
    assert.equal(body.divide[0].cell, 'WorkerCell');
    assert.equal(body.divide[0].max, 4);
    delete process.env.CELL_REDIS_MOCK;
  });
});
