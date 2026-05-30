#!/usr/bin/env node
/**
 * kind + prometheus-adapter HPA E2E
 * prerequisite: docker, kind, kubectl
 *
 *   node run-e2e.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const cluster = process.env.KIND_CLUSTER ?? 'cell-coding-e2e';
const image = process.env.CELL_RUNTIME_IMAGE ?? 'cell-coding/runtime:0.1.0';

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: opts.stdio ?? 'inherit', cwd: opts.cwd });
}

function tryRun(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function portForward(args) {
  const child = spawn('kubectl', args, { detached: true, stdio: 'ignore' });
  child.unref();
  return child;
}

async function main() {
  for (const bin of ['docker', 'kind', 'kubectl']) {
    if (!tryRun(bin, ['version'])) {
      console.error(`Missing ${bin} · ${bin} 설치 필요`);
      process.exit(1);
    }
  }

  const clusters = execFileSync('kind', ['get', 'clusters'], { encoding: 'utf-8' });
  if (!clusters.includes(cluster)) {
    run('kind', ['create', 'cluster', '--name', cluster, '--wait', '2m']);
  }

  run('docker', ['build', '-f', 'runtime-docker/Dockerfile', '-t', image, '.'], { cwd: repoRoot });
  run('kind', ['load', 'docker-image', image, '--name', cluster]);

  for (const file of [
    '00-namespaces.yaml',
    '10-redis.yaml',
    '20-worker-organ.yaml',
    '30-prometheus.yaml',
    '40-prometheus-adapter.yaml',
    '50-hpa.yaml',
  ]) {
    run('kubectl', ['apply', '-f', join(__dirname, 'manifests', file)]);
  }

  run('kubectl', ['wait', '--for=condition=available', 'deployment/redis', '-n', 'worker-organ', '--timeout=120s']);
  run('kubectl', ['wait', '--for=condition=available', 'deployment/worker-organ', '-n', 'worker-organ', '--timeout=180s']);
  run('kubectl', ['wait', '--for=condition=available', 'deployment/prometheus', '-n', 'monitoring', '--timeout=180s']);
  run('kubectl', ['wait', '--for=condition=available', 'deployment/prometheus-adapter', '-n', 'monitoring', '--timeout=180s']);

  console.log('Port-forward worker-organ :8085 → load queue depth...');
  portForward(['port-forward', '-n', 'worker-organ', 'svc/worker-organ', '8085:8080']);
  await sleep(2000);

  for (let i = 0; i < 8; i++) {
    await fetch('http://127.0.0.1:8085/v1/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Task', data: { id: `load-${i}` } }),
    });
  }

  console.log('Port-forward prometheus :9090 → verify scrape...');
  portForward(['port-forward', '-n', 'monitoring', 'svc/prometheus', '9090:9090']);
  await sleep(8000);

  run('node', [join(__dirname, '..', 'verify-prometheus.mjs')], { stdio: 'inherit' });
  run('node', [join(__dirname, 'verify-hpa.mjs')], { stdio: 'inherit' });

  console.log('E2E complete · prometheus-adapter + HPA verified');
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
