// ═══════════════════════════════════════════════════════════
//  Cell Coding — cloud-serve CLI (Docker entrypoint)
//  Usage · 사용법: CELL_PROGRAM=... CELL_ORGAN=AuthOrgan tsx serve.ts
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import { startCloudServe } from './cloud-serve.js';
import { startDivideGateway } from './divide-gateway.js';

async function main(): Promise<void> {
  if (process.env.CELL_ROLE === 'gateway') {
    const organ = process.env.CELL_ORGAN;
    const upstreams = process.env.CELL_DIVIDE_UPSTREAMS?.split(',').map(s => s.trim()).filter(Boolean);
    if (!organ || !upstreams?.length) {
      console.error('CELL_ORGAN + CELL_DIVIDE_UPSTREAMS required for gateway');
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
    return;
  }

  const programFile = process.env.CELL_PROGRAM ?? process.argv[2];
  if (!programFile) {
    console.error('Set CELL_PROGRAM or pass path · CELL_PROGRAM 또는 경로 필요');
    process.exit(1);
  }

  const handle = await startCloudServe({
    programFile: resolve(programFile),
    organ: process.env.CELL_ORGAN,
    port: Number(process.env.CELL_PORT ?? 8080),
  });

  console.error(
    `Cell cloud runtime listening on :${handle.port} · organ=${process.env.CELL_ORGAN ?? 'all'}`,
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
