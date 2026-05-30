// ═══════════════════════════════════════════════════════════
//  Cell Coding — Transpiler (Phase 3 PoC)
//  .cell AST → TypeScript 클래스·인터페이스
// ═══════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { compile } from './compile.js';
import type * as AST from './ast.js';
import { transpileHandlerBody } from './transpile-handler.js';
import {
  handlerMethodName,
  apoptosisMethodName,
  inlineTranspiledPreamble,
  transpiledImportLine,
} from './transpiled-cell.js';

export interface TranspileOptions {
  /** Source path for header comment · 소스 경로(헤더 주석) */
  sourceFile?: string;
  /** Emit only one cell · 특정 세포만 출력 */
  cellName?: string;
  /** true면 BaseCell inline · false면 ../transpiled-cell.js import (기본) */
  standalone?: boolean;
}

export interface TranspileResult {
  ok: boolean;
  sourceFile: string;
  errors: string[];
  code: string;
  cells: string[];
  signals: string[];
}

function tsType(type?: AST.TypeExpr): string {
  if (!type) return 'unknown';
  switch (type.kind) {
    case 'SimpleType':
      return mapPrimitive(type.name);
    case 'UnionType':
      return type.types.map(t => tsType(t)).join(' | ');
    case 'GenericType':
      return `${type.name}<${type.params.map(p => tsType(p)).join(', ')}>`;
    case 'ListType':
      return `${tsType(type.item)}[]`;
    case 'MapType':
      return `Record<${tsType(type.key)}, ${tsType(type.value)}>`;
    case 'OptionType':
      return `${tsType(type.inner)} | undefined`;
    case 'ResultType':
      return `{ ok: ${tsType(type.ok)}; err: ${tsType(type.err)} }`;
    default:
      return 'unknown';
  }
}

function mapPrimitive(name: string): string {
  switch (name) {
    case 'String': return 'string';
    case 'Number': return 'number';
    case 'Boolean': return 'boolean';
    case 'Bool': return 'boolean';
    default: return name;
  }
}

function typeNames(type?: AST.TypeExpr): string[] {
  if (!type) return [];
  switch (type.kind) {
    case 'SimpleType': return [type.name];
    case 'UnionType': return type.types.flatMap(t => typeNames(t));
    case 'GenericType': return [type.name, ...type.params.flatMap(p => typeNames(p))];
    case 'ListType': return typeNames(type.item);
    case 'MapType': return [...typeNames(type.key), ...typeNames(type.value)];
    case 'OptionType': return typeNames(type.inner);
    case 'ResultType': return [...typeNames(type.ok), ...typeNames(type.err)];
    default: return [];
  }
}

function emitSignalInterface(signal: AST.SignalDecl): string {
  const fields = signal.fields
    .map(f => {
      const opt = f.optional ? '?' : '';
      return `  ${f.name}${opt}: ${tsType(f.typeExpr)};`;
    })
    .join('\n');
  const ext = signal.extends ? ` extends ${signal.extends}` : '';
  return `export interface ${signal.name}${ext} {\n${fields}\n}`;
}

function transpileHandler(handler: AST.HandlerDecl): string {
  const body = transpileHandlerBody(handler.body, handler.paramName);
  return [
    `  ${handlerMethodName(handler.signalType)}(${handler.paramName}: ${handler.signalType}): void {`,
    body,
    `  }`,
  ].join('\n');
}

function transpileCell(cell: AST.CellDecl): string {
  const accepts = typeNames(cell.body.membrane.accepts);
  const emits = typeNames(cell.body.membrane.emits);
  const handlers = cell.body.handlers.map(transpileHandler).join('\n\n');
  const apoptosis = cell.body.apoptosis
    ? [
        `  ${apoptosisMethodName}(): void {`,
        transpileHandlerBody(cell.body.apoptosis.body, '_', '    '),
        `  }`,
      ].join('\n')
    : '';
  const role = cell.body.role.replace(/"/g, '\\"');

  return [
    `/** ${cell.body.role} */`,
    `export class ${cell.name} extends BaseCell {`,
    `  static readonly role = "${role}";`,
    `  static readonly accepts = ${JSON.stringify(accepts)} as const;`,
    `  static readonly emits = ${JSON.stringify(emits)} as const;`,
    '',
    handlers,
    apoptosis ? `\n${apoptosis}` : '',
    `}`,
  ].join('\n');
}

/** Transpile a compiled program to TypeScript source. */
/** 컴파일된 program을 TypeScript 소스로 트랜스파일한다. */
export function transpileProgram(
  program: AST.Program,
  opts: TranspileOptions = {},
): TranspileResult {
  const signals = program.statements.filter(
    (s): s is AST.SignalDecl => s.kind === 'SignalDecl',
  );
  const cells = program.statements.filter(
    (s): s is AST.CellDecl => s.kind === 'CellDecl',
  );

  const filteredCells = opts.cellName
    ? cells.filter(c => c.name === opts.cellName)
    : cells;

  if (opts.cellName && filteredCells.length === 0) {
    return {
      ok: false,
      sourceFile: opts.sourceFile ?? '',
      errors: [`Cell '${opts.cellName}' not found · 세포를 찾을 수 없음`],
      code: '',
      cells: [],
      signals: [],
    };
  }

  const usedSignals = new Set<string>();
  for (const cell of filteredCells) {
    for (const name of typeNames(cell.body.membrane.accepts)) usedSignals.add(name);
    for (const name of typeNames(cell.body.membrane.emits)) usedSignals.add(name);
    for (const handler of cell.body.handlers) usedSignals.add(handler.signalType);
  }

  const signalBlocks = signals
    .filter(s => !opts.cellName || usedSignals.has(s.name))
    .map(emitSignalInterface);

  const cellBlocks = filteredCells.map(transpileCell);
  const standalone = opts.standalone ?? false;
  const preamble = standalone
    ? inlineTranspiledPreamble()
    : [transpiledImportLine()];
  const header = [
    '// Generated by Cell Coding transpiler · Cell Coding 트랜스파일러 생성',
    opts.sourceFile ? `// Source · 소스: ${opts.sourceFile.replace(/\\/g, '/')}` : '',
    '/* eslint-disable */',
    '',
    ...preamble,
    '',
  ].filter(Boolean);

  const code = [...header, ...signalBlocks, '', ...cellBlocks].join('\n\n');

  return {
    ok: true,
    sourceFile: opts.sourceFile ?? '',
    errors: [],
    code,
    cells: filteredCells.map(c => c.name),
    signals: signalBlocks.map((_, i) =>
      signals.filter(s => !opts.cellName || usedSignals.has(s.name))[i]?.name ?? '',
    ).filter(Boolean),
  };
}

export interface TranspileFileOptions extends TranspileOptions {
  file: string;
}

/** Compile and transpile a `.cell` file. */
/** `.cell` 파일을 컴파일하고 transpile한다. */
export function transpileCellFile(opts: TranspileFileOptions): TranspileResult {
  const file = resolve(opts.file);
  let source: string;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (e) {
    return {
      ok: false,
      sourceFile: file,
      errors: [e instanceof Error ? e.message : String(e)],
      code: '',
      cells: [],
      signals: [],
    };
  }

  let program: AST.Program;
  let diagnostics;
  try {
    ({ program, diagnostics } = compile(source));
  } catch (e) {
    return {
      ok: false,
      sourceFile: file,
      errors: [e instanceof Error ? e.message : String(e)],
      code: '',
      cells: [],
      signals: [],
    };
  }

  const errors = diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  if (errors.length > 0) {
    return {
      ok: false,
      sourceFile: file,
      errors,
      code: '',
      cells: [],
      signals: [],
    };
  }

  return transpileProgram(program, {
    sourceFile: file,
    cellName: opts.cellName,
  });
}

/** Default generated output path for a `.cell` file. */
/** `.cell` 파일의 기본 generated 출력 경로 */
export function defaultBuildOutPath(cellFile: string, outDir = 'generated'): string {
  const stem = basename(cellFile, '.cell');
  return resolve(outDir, `${stem}.ts`);
}
