// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell inspect CLI (Phase 3)
//  Usage · 사용법:
//    npm run cell:inspect -- <file.cell> [target]
// ═══════════════════════════════════════════════════════════

import { resolve } from 'node:path';
import { inspectCellFile, formatInspectHuman } from './cell-inspect.js';

interface ParsedArgs {
  json: boolean;
  file?: string;
  target?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const rest: string[] = [];
  let json = false;
  for (const arg of argv) {
    if (arg === '--json') json = true;
    else rest.push(arg);
  }
  const [file, target] = rest;
  return { json, file, target };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.error(`Usage · 사용법:
  npm run cell:inspect -- [--json] <file.cell> [target]

Examples · 예:
  npm run cell:inspect -- ../examples/porifera-filter/sponge-organism.cell
  npm run cell:inspect -- ../examples/porifera-filter/sponge-organism.cell FilterTissue
  npm run cell:inspect -- --json ../examples/validator.cell Validator`);
    process.exit(1);
  }

  const result = inspectCellFile({
    file: resolve(process.cwd(), args.file),
    target: args.target,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatInspectHuman(result));
  }

  process.exit(result.ok ? 0 : 1);
}

main();
