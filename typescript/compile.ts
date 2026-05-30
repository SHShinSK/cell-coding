// ═══════════════════════════════════════════════════════════
//  Cell Coding — Compiler entry point
//  .cell 소스 → 토큰 → AST → 타입 검사 진단
// ═══════════════════════════════════════════════════════════

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { TypeChecker, type TypeCheckError } from './checker.js';
import { transpile, type TranspileResult } from './transpiler.js';
import type { Program } from './ast.js';

export interface CompileResult {
  program:     Program;
  diagnostics: TypeCheckError[];
  transpiled?:  TranspileResult;
}

export function compile(source: string, shouldTranspile?: boolean): CompileResult {
  const tokens = new Lexer(source).tokenize();
  const program = new Parser(tokens).parse();
  const diagnostics = new TypeChecker().check(program);
  const result: CompileResult = { program, diagnostics };
  if (shouldTranspile) {
    result.transpiled = transpile(program);
  }
  return result;
}

export { Lexer, Parser, TypeChecker, transpile };
export type { TypeCheckError, Program, TranspileResult };
