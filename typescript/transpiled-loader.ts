// ═══════════════════════════════════════════════════════════
//  Cell Coding — Transpiled module loader (Phase 3+)
//  cell build 출력 · standalone cache → dynamic import
// ═══════════════════════════════════════════════════════════

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import type * as AST from './ast.js';
import { transpileProgram } from './transpiler.js';
import type { TranspiledCellCtor, TranspiledCellRegistration } from './transpiled-runtime.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUN_CACHE_DIR = join(__dirname, '.cell-run-cache');

export interface LoadTranspiledOptions {
  /** cell build 출력 디렉터리 · 없으면 standalone cache transpile */
  generatedDir?: string;
  /** wire-up 대상 세포 · 기본: program 내 모든 CellDecl */
  cellNames?: string[];
}

function cellNamesFromProgram(program: AST.Program, subset?: string[]): string[] {
  const all = program.statements
    .filter((s): s is AST.CellDecl => s.kind === 'CellDecl')
    .map(c => c.name);
  if (!subset?.length) return all;
  for (const name of subset) {
    if (!all.includes(name)) {
      throw new Error(`Cell '${name}' not in program · program에 세포 없음`);
    }
  }
  return subset;
}

function isTranspiledCellCtor(value: unknown): value is TranspiledCellCtor {
  // standalone codegen은 inline BaseCell 사용 · instanceof 불가
  return typeof value === 'function';
}

function registrationsFromModule(
  mod: Record<string, unknown>,
  cellNames: string[],
): TranspiledCellRegistration[] {
  const registrations: TranspiledCellRegistration[] = [];
  for (const cellName of cellNames) {
    const Cell = mod[cellName];
    if (!isTranspiledCellCtor(Cell)) {
      throw new Error(
        `Missing transpiled class '${cellName}' · transpiled 클래스 없음 (cell build 후 import)`,
      );
    }
    registrations.push({ cellName, Cell });
  }
  return registrations;
}

/** generated/*.ts 또는 standalone cache에서 transpiled 클래스 로드 */
export async function loadTranspiledRegistrations(
  cellFile: string,
  program: AST.Program,
  opts: LoadTranspiledOptions = {},
): Promise<TranspiledCellRegistration[]> {
  const absFile = resolve(cellFile);
  const stem = basename(absFile, '.cell');
  const cellNames = cellNamesFromProgram(program, opts.cellNames);

  let modulePath: string;
  if (opts.generatedDir) {
    modulePath = resolve(opts.generatedDir, `${stem}.ts`);
    if (!existsSync(modulePath)) {
      throw new Error(
        `Generated file not found · 생성 파일 없음: ${modulePath.replace(/\\/g, '/')} (cell build 먼저 실행)`,
      );
    }
  } else {
    const transpiled = transpileProgram(program, {
      sourceFile: absFile,
      standalone: true,
    });
    if (!transpiled.ok) {
      throw new Error(transpiled.errors.join('\n'));
    }
    mkdirSync(RUN_CACHE_DIR, { recursive: true });
    modulePath = join(RUN_CACHE_DIR, `${stem}.ts`);
    writeFileSync(modulePath, transpiled.code, 'utf-8');
  }

  const mod = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  return registrationsFromModule(mod as Record<string, unknown>, cellNames);
}
