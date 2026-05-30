#!/usr/bin/env node
/** OTel Collector + Jaeger trace 검증 · observability 프로필 실행 후 */

const workerUrl = process.env.WORKER_URL ?? 'http://127.0.0.1:8085';
const jaegerUrl = process.env.JAEGER_URL ?? 'http://127.0.0.1:16686';
const service = process.env.OTEL_SERVICE ?? 'cell-organ-WorkerOrgan';
const maxWaitMs = Number(process.env.VERIFY_TIMEOUT_MS ?? 90_000);
const pollMs = Number(process.env.VERIFY_POLL_MS ?? 3_000);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const signalRes = await fetch(`${workerUrl}/v1/signals`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'Task', data: { id: 'otel-verify' } }),
});
if (!signalRes.ok) {
  console.error('worker signal POST failed', signalRes.status);
  process.exit(1);
}

const query = new URLSearchParams({ service, limit: '5' });
const started = Date.now();
let lastErr = '';

while (Date.now() - started < maxWaitMs) {
  try {
    const traceRes = await fetch(`${jaegerUrl}/api/traces?${query}`);
    if (!traceRes.ok) {
      lastErr = `Jaeger query failed ${traceRes.status}`;
      await sleep(pollMs);
      continue;
    }
    const body = await traceRes.json();
    if (body?.data?.length) {
      console.log(`OK · Jaeger traces for ${service}:`, body.data.length);
      for (const trace of body.data.slice(0, 3)) {
        const spans = trace.spans ?? [];
        console.log(' ', spans.map(s => s.operationName).filter(Boolean).join(' → '));
      }
      process.exit(0);
    }
    lastErr = `No traces for service=${service}`;
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }
  await sleep(pollMs);
}

console.error('OTel/Jaeger verification timed out');
console.error(lastErr);
process.exit(1);
