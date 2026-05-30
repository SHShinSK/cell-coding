#!/usr/bin/env node
/**
 * K8s prometheus-adapter E2E 검증
 * run-e2e.mjs 실행 후 · custom.metrics.k8s.io API 확인
 */

import { execFileSync } from 'node:child_process';

const kubectl = process.env.KUBECTL ?? 'kubectl';
const namespace = process.env.HPA_NAMESPACE ?? 'worker-organ';
const organ = process.env.HPA_ORGAN ?? 'WorkerOrgan';
const maxWaitMs = Number(process.env.HPA_VERIFY_TIMEOUT_MS ?? 120_000);
const pollMs = 5000;

function kubectlRaw(path) {
  return execFileSync(kubectl, ['get', '--raw', path], { encoding: 'utf-8' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log('Checking custom.metrics.k8s.io API registration...');
const apiList = JSON.parse(kubectlRaw('/apis/custom.metrics.k8s.io/v1beta1'));
const resources = (apiList.resources ?? []).map(r => r.name);
console.log('Registered resources:', resources.join(', ') || '(none yet)');

const metricPath =
  `/apis/custom.metrics.k8s.io/v1beta1/namespaces/${namespace}/` +
  `metrics/cell_signal_queue_depth?labelSelector=organ%3D${organ}`;

console.log('Waiting for external metric:', metricPath);
const started = Date.now();
let lastErr = '';
while (Date.now() - started < maxWaitMs) {
  try {
    const body = JSON.parse(kubectlRaw(metricPath));
    if (body?.items?.length || body?.value !== undefined) {
      console.log('OK · custom metric exposed:', JSON.stringify(body));
      const hpa = JSON.parse(
        execFileSync(kubectl, ['get', 'hpa', 'worker-organ-hpa', '-n', namespace, '-o', 'json'], {
          encoding: 'utf-8',
        }),
      );
      console.log('HPA status:', JSON.stringify(hpa.status ?? {}));
      process.exit(0);
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }
  await sleep(pollMs);
}

console.error('Timed out waiting for cell_signal_queue_depth external metric');
console.error(lastErr);
process.exit(1);
