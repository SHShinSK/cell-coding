// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell deploy CLI (Phase 4)
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import { deployCellFile, formatDeployHuman } from './cell-deploy.js';

function main(): void {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  let outDir: string | undefined;
  let namespace: string | undefined;
  const rest: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') continue;
    else if (arg === '--out') outDir = args[++i];
    else if (arg === '--namespace') namespace = args[++i];
    else rest.push(arg);
  }

  const file = rest[0];
  if (!file) {
    console.error(`Usage · 사용법:
  npm run cell:deploy -- [--json] [--out dir] [--namespace ns] <file.cell>

Examples · 예:
  npm run cell:deploy -- ./my-organism/cells/main.composed.cell
  npm run cell:deploy -- --out ./deploy/k8s ../examples/porifera-filter/sponge-organism.cell`);
    process.exit(1);
  }

  const result = deployCellFile({
    file: resolve(process.cwd(), file),
    outDir: outDir ? resolve(process.cwd(), outDir) : undefined,
    namespace,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatDeployHuman(result));
  }
  process.exit(result.ok ? 0 : 1);
}

main();
