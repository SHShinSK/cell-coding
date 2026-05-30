// ═══════════════════════════════════════════════════════════
//  Cell Coding — divide gateway CLI (Docker entrypoint)
//  CELL_ROLE=gateway · CELL_DIVIDE_UPSTREAMS=...
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import { startDivideGateway } from './divide-gateway.js';

async function main(): Promise<void> {
  const organ = process.env.CELL_ORGAN;
  const upstreams = process.env.CELL_DIVIDE_UPSTREAMS?.split(',').map(s => s.trim()).filter(Boolean);
  if (!organ || !upstreams?.length) {
    console.error('CELL_ORGAN + CELL_DIVIDE_UPSTREAMS required');
    process.exit(1);
  }

  const handle = await startDivideGateway({
    organ,
    upstreams,
    redisUrl: process.env.CELL_REDIS_URL,
    programFile: process.env.CELL_PROGRAM ? resolve(process.env.CELL_PROGRAM) : undefined,
    port: Number(process.env.CELL_PORT ?? 8080),
  });

  console.error(`Cell divide gateway listening on :${handle.port} · organ=${organ}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
