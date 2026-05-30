#!/usr/bin/env node
/** Prometheus scrape 검증 · cell_signal_queue_depth 쿼리 */

const prom = process.env.PROMETHEUS_URL ?? 'http://127.0.0.1:9090';
const query = encodeURIComponent('cell_signal_queue_depth');
const maxWaitMs = Number(process.env.VERIFY_TIMEOUT_MS ?? 90_000);
const pollMs = Number(process.env.VERIFY_POLL_MS ?? 3_000);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const started = Date.now();
let lastBody = null;

while (Date.now() - started < maxWaitMs) {
  const url = `${prom}/api/v1/query?query=${query}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Prometheus query failed', res.status);
    await sleep(pollMs);
    continue;
  }

  const body = await res.json();
  lastBody = body;
  if (body.status === 'success' && body.data?.result?.length) {
    console.log('OK · metrics found:', body.data.result.length);
    for (const row of body.data.result) {
      console.log(' ', row.metric);
    }
    process.exit(0);
  }
  await sleep(pollMs);
}

console.error('No cell_signal_queue_depth series found within timeout');
console.error(JSON.stringify(lastBody, null, 2));
process.exit(1);
