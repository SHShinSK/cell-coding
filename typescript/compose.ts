// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell compose CLI (Phase 4)
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import { composeOrgan, formatComposeHuman } from './cell-compose.js';

function parseArgs(argv: string[]) {
  const rest: string[] = [];
  let json = false;
  let projectDir = '.';
  let packageRef: string | undefined;
  let hostFile: string | undefined;
  let outFile: string | undefined;
  let routeSource: string | undefined;
  let routeTarget: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--organ') packageRef = argv[++i];
    else if (arg === '--project') projectDir = argv[++i];
    else if (arg === '--host') hostFile = argv[++i];
    else if (arg === '--out') outFile = argv[++i];
    else if (arg === '--route') {
      routeSource = argv[++i];
      routeTarget = argv[++i];
    } else rest.push(arg);
  }

  if (!packageRef && rest[0]) packageRef = rest[0];
  if (rest[1]) projectDir = rest[1];

  return { json, projectDir, packageRef, hostFile, outFile, routeSource, routeTarget };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.packageRef) {
    console.error(`Usage · 사용법:
  npm run cell:compose -- [--json] --organ <package> [--project dir] [--host file] [--out file]
  npm run cell:compose -- --organ @community/auth-organ --route EchoOrgan.Pong EchoOrgan

Examples · 예:
  npm run cell:compose -- --organ @community/auth-organ ./my-organism`);
    process.exit(1);
  }

  const result = composeOrgan({
    projectDir: resolve(process.cwd(), args.projectDir),
    packageRef: args.packageRef,
    hostFile: args.hostFile,
    outFile: args.outFile,
    nervousRoute:
      args.routeSource && args.routeTarget
        ? { source: args.routeSource, targetOrgan: args.routeTarget }
        : undefined,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatComposeHuman(result));
  }
  process.exit(result.ok ? 0 : 1);
}

main();
