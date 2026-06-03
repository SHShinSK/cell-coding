// ═══════════════════════════════════════════════════════════
//  Cell Coding — Transpiled runtime wire-up (Phase 3+)
//  cell build 클래스 → CellRuntime handler 연동
// ═══════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type * as AST from './ast.js';
import { compile } from './compile.js';
import { CellRuntime, type RuntimeOptions, type SignalInstance } from './runtime.js';
import { loadTranspiledRegistrations, type LoadTranspiledOptions } from './transpiled-loader.js';
import {
  BaseCell,
  handlerMethodName,
  apoptosisMethodName,
  type CellHandlerFn,
} from './transpiled-cell.js';

export interface TranspiledApoptosisHook {
  cell: string;
  invoke: () => void;
}

export interface TranspiledHandlerBinding {
  cell: string;
  signalType: string;
  invoke: (signal: SignalInstance) => void;
}

export type TranspiledCellCtor = new (
  fns: Record<string, CellHandlerFn>,
  emitSignal: (type: string, data?: Record<string, unknown>) => void,
) => BaseCell;

export interface TranspiledCellRegistration {
  cellName: string;
  Cell: TranspiledCellCtor;
}

/** transpiled handler + apoptosis binding 목록 생성 */
export function buildTranspiledBindings(
  program: AST.Program,
  runtime: CellRuntime,
  cells: TranspiledCellRegistration[],
  fns: Record<string, CellHandlerFn> = {},
): { bindings: TranspiledHandlerBinding[]; apoptosis: TranspiledApoptosisHook[] } {
  const bindings: TranspiledHandlerBinding[] = [];
  const apoptosis: TranspiledApoptosisHook[] = [];

  for (const { cellName, Cell } of cells) {
    const cellDecl = program.statements.find(
      (s): s is AST.CellDecl => s.kind === 'CellDecl' && s.name === cellName,
    );
    if (!cellDecl) {
      throw new Error(`Cell '${cellName}' not in program · program에 세포 없음`);
    }

    const instance = new Cell(fns, (type, data) => {
      runtime.emitFromCell(cellName, type, data ?? {});
    });

    for (const handler of cellDecl.body.handlers) {
      const method = handlerMethodName(handler.signalType);
      const fn = (instance as unknown as Record<string, unknown>)[method];
      if (typeof fn !== 'function') {
        throw new Error(`Missing ${method} on ${cellName} · 메서드 없음`);
      }
      bindings.push({
        cell: cellName,
        signalType: handler.signalType,
        invoke: signal => {
          fn.call(instance, signal.data);
        },
      });
    }

    if (cellDecl.body.apoptosis) {
      const hook = (instance as unknown as Record<string, unknown>)[apoptosisMethodName];
      if (typeof hook === 'function') {
        apoptosis.push({
          cell: cellName,
          invoke: () => {
            hook.call(instance);
          },
        });
      }
    }
  }

  return { bindings, apoptosis };
}

/** transpiled 클래스로 CellRuntime 생성 · AST interpreter 대신 TS handler 실행 */
export function createTranspiledRuntime(
  program: AST.Program,
  cells: TranspiledCellRegistration[],
  opts: RuntimeOptions = {},
): CellRuntime {
  const runtime = new CellRuntime(program, opts);
  const { bindings, apoptosis } = buildTranspiledBindings(program, runtime, cells, opts.functions ?? {});
  runtime.wireTranspiledHandlers(bindings);
  if (apoptosis.length) runtime.wireTranspiledApoptosis(apoptosis);
  return runtime;
}

/** .cell 파일 → transpile/load → wire-up (수동 클래스 등록 불필요) */
export async function createTranspiledRuntimeFromFile(
  cellFile: string,
  opts: LoadTranspiledOptions & RuntimeOptions = {},
): Promise<{ runtime: CellRuntime; program: AST.Program }> {
  const abs = resolve(cellFile);
  const source = readFileSync(abs, 'utf-8');
  const { program, diagnostics } = compile(source);
  const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const { generatedDir, cellNames, ...runtimeOpts } = opts;
  const registrations = await loadTranspiledRegistrations(abs, program, { generatedDir, cellNames });
  const runtime = createTranspiledRuntime(program, registrations, runtimeOpts);
  return { runtime, program };
}
