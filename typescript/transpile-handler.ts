// ═══════════════════════════════════════════════════════════
//  Cell Coding — Handler body codegen (Phase 3+)
//  on() 블록 AST → TypeScript 문장
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';

const INDENT = '  ';

/** handler on() 블록을 TypeScript 본문으로 변환 */
export function transpileHandlerBody(body: AST.Stmt[], paramName: string, baseIndent = INDENT): string {
  const scope = new Set<string>([paramName]);
  const lines = transpileStmts(body, scope, baseIndent);
  return lines.join('\n');
}

function transpileStmts(stmts: AST.Stmt[], scope: Set<string>, indent: string): string[] {
  const lines: string[] = [];
  for (const stmt of stmts) {
    lines.push(...transpileStmt(stmt, scope, indent));
  }
  return lines;
}

function transpileStmt(stmt: AST.Stmt, scope: Set<string>, indent: string): string[] {
  switch (stmt.kind) {
    case 'EmitStmt': {
      if (!stmt.args || !Object.keys(stmt.args).length) {
        return [`${indent}this.emit(${JSON.stringify(stmt.signalName)});`];
      }
      const fields = Object.entries(stmt.args)
        .map(([key, expr]) => `${key}: ${transpileExpr(expr, scope)}`)
        .join(', ');
      return [
        `${indent}this.emit(${JSON.stringify(stmt.signalName)}, { ${fields} });`,
      ];
    }
    case 'IfStmt': {
      const lines = [`${indent}if (${transpileExpr(stmt.condition, scope)}) {`];
      lines.push(...transpileStmts(stmt.then, new Set(scope), indent + INDENT));
      if (stmt.otherwise?.length) {
        lines.push(`${indent}} else {`);
        lines.push(...transpileStmts(stmt.otherwise, new Set(scope), indent + INDENT));
        lines.push(`${indent}}`);
      } else {
        lines.push(`${indent}}`);
      }
      return lines;
    }
    case 'LetStmt': {
      const childScope = new Set(scope);
      childScope.add(stmt.name);
      return [`${indent}const ${stmt.name} = ${transpileExpr(stmt.value, scope)};`];
    }
    case 'ExprStmt':
      return [`${indent}${transpileExpr(stmt.expr, scope)};`];
    case 'ReturnStmt':
      return [`${indent}/* return · no-op (AST parity) */`];
    case 'AbsorbStmt':
      return [`${indent}/* absorb · no-op (AST parity) */`];
    default:
      return [`${indent}// unsupported stmt · 미지원 문장`];
  }
}

/** 표현식 AST → TypeScript 표현식 */
export function transpileExpr(expr: AST.Expr, scope: Set<string>): string {
  switch (expr.kind) {
    case 'LiteralExpr':
      return JSON.stringify(expr.value);
    case 'IdentExpr':
      return expr.name;
    case 'MemberExpr':
      return `${transpileExpr(expr.object, scope)}.${expr.prop}`;
    case 'CallExpr':
      if (expr.callee.kind === 'IdentExpr') {
        const args = expr.args.map(a => transpileExpr(a, scope)).join(', ');
        return `this.callFn(${JSON.stringify(expr.callee.name)}${args ? `, ${args}` : ''})`;
      }
      return `${transpileExpr(expr.callee, scope)}(${expr.args.map(a => transpileExpr(a, scope)).join(', ')})`;
    case 'UnaryExpr':
      return expr.op === '!'
        ? `!${transpileExpr(expr.expr, scope)}`
        : `${expr.op}${transpileExpr(expr.expr, scope)}`;
    case 'TernaryExpr':
      return `${transpileExpr(expr.condition, scope)} ? ${transpileExpr(expr.then, scope)} : ${transpileExpr(expr.otherwise, scope)}`;
    case 'BinaryExpr':
      return `${transpileExpr(expr.left, scope)} ${expr.op} ${transpileExpr(expr.right, scope)}`;
    default:
      return 'undefined';
  }
}
