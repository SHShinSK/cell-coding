// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell test CLI (Cell Lab)
//  Usage · 사용법:
//    npm run cell:test -- <file.cell> [target]
//    npm run cell:test -- --json ../examples/.../sponge-organism.cell FilterTissue
// ═══════════════════════════════════════════════════════════

import { runCellTestFile, formatCellTestHuman } from './cell-lab.js';

interface ParsedArgs {
  json: boolean;
  coverage: boolean;
  file?: string;
  target?: string;
  testFile?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const rest: string[] = [];
  let json = false;
  let coverage = false;
  let testFile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--coverage') {
      coverage = true;
    } else if (arg === '--tests') {
      testFile = argv[++i];
    } else {
      rest.push(arg);
    }
  }

  const [file, target] = rest;
  return { json, coverage, file, target, testFile };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.error(`Usage · 사용법:
  npm run cell:test -- [--json] [--coverage] [--tests path.celltest.json] <file.cell> [target]

Examples · 예:
  npm run cell:test -- ../examples/porifera-filter/sponge-organism.cell
  npm run cell:test -- ../examples/porifera-filter/sponge-organism.cell FilterDecideCell
  npm run cell:test -- --json ../examples/porifera-filter/sponge-organism.cell FilterTissue`);
    process.exit(1);
  }

  const result = runCellTestFile({
    file: args.file,
    testFile: args.testFile,
    filterTarget: args.target,
    coverage: args.coverage,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatCellTestHuman(result));
  }

  process.exit(result.ok ? 0 : 1);
}

main();
