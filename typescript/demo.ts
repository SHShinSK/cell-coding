// ═══════════════════════════════════════════════════════════
//  Cell Coding — Runtime demo (Phase 2)
//  Compiles a .cell file and runs the signal cascade.
//  .cell 파일을 컴파일하고 신호 연쇄를 실행한다.
//
//  Usage · 사용법:
//    node --import tsx demo.ts <file.cell> <SignalType> '<json>'
//  Default · 기본값: Porifera Filter Bot
// ═══════════════════════════════════════════════════════════

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { formatRunHuman, runCellFile } from './run-cell.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const [, , fileArg, typeArg, jsonArg] = process.argv;

const file = fileArg
  ? resolve(process.cwd(), fileArg)
  : join(__dirname, '../examples/porifera-filter/sponge-organism.cell');
const inputType = typeArg ?? 'WaterSample';
const inputData = jsonArg ? JSON.parse(jsonArg) : { turbidity: 0.5, flowRate: 12 };

const result = runCellFile({
  file,
  input: { type: inputType, data: inputData },
});

if (!result.ok) {
  console.error('Compile errors · 컴파일 오류:');
  for (const e of result.errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(formatRunHuman(result, { type: inputType, data: inputData }));
