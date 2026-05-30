// ═══════════════════════════════════════════════════════════
//  Cell Coding — cell build CLI (Phase 3)
//  Usage · 사용법:
//    npm run cell:build -- <file.cell> [--out dir] [--cell Name] [--stdout]
// ═══════════════════════════════════════════════════════════

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defaultBuildOutPath, transpileCellFile } from './transpiler.js';

interface ParsedArgs {
  json: boolean;
  stdout: boolean;
  outDir?: string;
  cellName?: string;
  file?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const rest: string[] = [];
  let json = false;
  let stdout = false;
  let outDir: string | undefined;
  let cellName: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--stdout') stdout = true;
    else if (arg === '--out') outDir = argv[++i];
    else if (arg === '--cell') cellName = argv[++i];
    else rest.push(arg);
  }

  return { json, stdout, outDir, cellName, file: rest[0] };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.error(`Usage · 사용법:
  npm run cell:build -- [--stdout] [--out dir] [--cell Name] [--json] <file.cell>

Examples · 예:
  npm run cell:build -- ../examples/validator.cell
  npm run cell:build -- --stdout ../examples/validator.cell
  npm run cell:build -- --out generated --cell Validator ../examples/validator.cell`);
    process.exit(1);
  }

  const result = transpileCellFile({
    file: resolve(process.cwd(), args.file),
    cellName: args.cellName,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (!result.ok) {
    console.error('Build errors · 빌드 오류:');
    for (const e of result.errors) console.error(`  ${e}`);
    process.exit(1);
  }

  if (args.stdout) {
    console.log(result.code);
    return;
  }

  const outPath = defaultBuildOutPath(
    resolve(process.cwd(), args.file),
    args.outDir ? resolve(process.cwd(), args.outDir) : resolve(process.cwd(), 'generated'),
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.code, 'utf-8');
  console.log(`Wrote ${outPath.replace(/\\/g, '/')} (${result.cells.length} cell(s), ${result.signals.length} signal(s))`);
}

main();
