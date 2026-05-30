// ═══════════════════════════════════════════════════════════
//  Cell Coding — Compiler entry point
//  .cell 소스 → 토큰 → AST → 타입 검사 진단
// ═══════════════════════════════════════════════════════════

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { TypeChecker, type TypeCheckError } from './checker.js';
import type { Program } from './ast.js';

export interface CompileResult {
  program:     Program;
  diagnostics: TypeCheckError[];
}

export function compile(source: string): CompileResult {
  const tokens = new Lexer(source).tokenize();
  const program = new Parser(tokens).parse();
  const diagnostics = new TypeChecker().check(program);
  return { program, diagnostics };
}

export { Lexer, Parser, TypeChecker };
export type { TypeCheckError, Program };
