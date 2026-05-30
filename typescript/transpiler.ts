// ═══════════════════════════════════════════════════════════
//  Cell Coding — Transpiler: .cell AST → TypeScript output
//  cell AST를 TypeScript 클래스로 변환하는 진입점
// ═══════════════════════════════════════════════════════════

import type {
  Program,
  TopLevelDecl,
  CellDecl,
  CellBody,
  MembraneDecl,
  NucleusDecl,
  HandlerDecl,
  Stmt,
  Expr,
} from './ast.js';

// ── 결과 ──────────────────────────────────────────────────
export interface TranspileResult {
  code: string;
  diagnostics: TranspileDiagnostic[];
}

export interface TranspileDiagnostic {
  kind: 'error' | 'warning';
  message: string;
}

// ── 진입점 ──────────────────────────────────────────────────
export function transpile(program: Program): TranspileResult {
  const diagnostics: TranspileDiagnostic[] = [];
  const lines: string[] = [];

  for (const stmt of program.statements) {
    if (stmt.kind === 'CellDecl') {
      const cellLines = transpileCellDecl(stmt, diagnostics);
      lines.push(...cellLines);
    }
    // Future: handle SignalDecl, TissueDecl, etc.
  }

  return { code: lines.join('\n'), diagnostics };
}

// ── CellDecl → TypeScript 클래스 ──────────────────────────
function transpileCellDecl(decl: CellDecl, diagnostics: TranspileDiagnostic[]): string[] {
  const lines: string[] = [];
  const { name, body } = decl;

  // Decorator: @cell({ role: "..." })
  const decoratorArgs: string[] = [];
  decoratorArgs.push(`role: ${JSON.stringify(body.role)}`);
  if (body.tags && body.tags.length > 0) {
    decoratorArgs.push(`tags: ${JSON.stringify(body.tags)}`);
  }
  if (body.lifespan) {
    decoratorArgs.push(`lifespan: ${JSON.stringify(body.lifespan)}`);
  }
  lines.push(`@cell({ ${decoratorArgs.join(', ')} })`);

  // Class declaration
  lines.push(`export class ${name} extends BaseCell {`);

  // Nucleus fields (state)
  if (body.nucleus && body.nucleus.fields.length > 0) {
    for (const field of body.nucleus.fields) {
      const optSuffix = field.optional ? '?' : '';
      const typeStr = typeExprToString(field.typeExpr);
      lines.push(`  ${field.name}${optSuffix}: ${typeStr};`);
    }
  }

  // Membrane accessors
  if (body.membrane) {
    lines.push('');
    const membrane = body.membrane;
    if (membrane.accepts) {
      const typeStr = typeExprToString(membrane.accepts);
      const querySuffix = membrane.acceptsIsQuery ? ' /* query */' : '';
      lines.push(`  accepts: ${typeStr}${querySuffix};`);
    }
    if (membrane.emits) {
      const typeStr = typeExprToString(membrane.emits);
      lines.push(`  emits: ${typeStr};`);
    }
  }

  // Handlers
  if (body.handlers.length > 0) {
    lines.push('');
    for (const handler of body.handlers) {
      lines.push(...transpileHandler(handler));
    }
  }

  lines.push('}');
  lines.push('');
  return lines;
}

// ── Handler → TS method ──────────────────────────────────
function transpileHandler(handler: HandlerDecl): string[] {
  const lines: string[] = [];
  const signalType = handler.signalType;
  const paramName = handler.paramName || 'msg';
  const querySuffix = handler.isQuery ? ' /* query */' : '';
  lines.push(`  on${signalType}(${paramName}: ${signalType})${querySuffix} {`);

  for (const stmt of handler.body) {
    const stmtStr = transpileStmt(stmt, 2);
    if (stmtStr) lines.push(stmtStr);
  }

  lines.push(`  }`);
  return lines;
}

// ── 문장 → TS ────────────────────────────────────────────
function transpileStmt(stmt: Stmt, indent: number): string {
  const pad = '  '.repeat(indent);
  switch (stmt.kind) {
    case 'EmitStmt': {
      const args = stmt.args
        ? Object.entries(stmt.args)
            .map(([k, v]) => `${k}: ${transpileExpr(v)}`)
            .join(', ')
        : '';
      return `${pad}this.emit(${stmt.signalName}${args ? `, { ${args} }` : ''});`;
    }
    case 'LetStmt':
      return `${pad}const ${stmt.name} = ${transpileExpr(stmt.value)};`;
    case 'ExprStmt':
      return `${pad}${transpileExpr(stmt.expr)};`;
    case 'ReturnStmt':
      return stmt.value
        ? `${pad}return ${transpileExpr(stmt.value)};`
        : `${pad}return;`;
    default:
      return `${pad}// TODO: ${stmt.kind}`;
  }
}

// ── 표현식 → TS ──────────────────────────────────────────
function transpileExpr(expr: Expr): string {
  switch (expr.kind) {
    case 'LiteralExpr':
      return JSON.stringify(expr.value);
    case 'IdentExpr':
      return expr.name;
    case 'MemberExpr':
      return `${transpileExpr(expr.object)}.${expr.prop}`;
    case 'CallExpr':
      return `${transpileExpr(expr.callee)}(${expr.args.map(transpileExpr).join(', ')})`;
    case 'BinaryExpr':
      return `(${transpileExpr(expr.left)} ${expr.op} ${transpileExpr(expr.right)})`;
    case 'UnaryExpr':
      return `${expr.op}${transpileExpr(expr.expr)}`;
    case 'TernaryExpr':
      return `(${transpileExpr(expr.condition)} ? ${transpileExpr(expr.then)} : ${transpileExpr(expr.otherwise)})`;
    default:
      return `/* unknown expr: ${(expr as { kind: string }).kind} */`;
  }
}

// ── 타입 표현식 → TS 문자열 ──────────────────────────────
function typeExprToString(typeExpr: Expr | { kind: string; [key: string]: unknown }): string {
  switch (typeExpr.kind) {
    case 'SimpleType':
      return (typeExpr as { name: string }).name;
    case 'UnionType': {
      const types = (typeExpr as { types: unknown[] }).types;
      return types.map(t => typeExprToString(t as Parameters<typeof typeExprToString>[0])).join(' | ');
    }
    case 'ListType':
      return `${typeExprToString({ kind: 'SimpleType', name: (typeExpr as { item: unknown }).item as string })}[]`;
    case 'MapType': {
      const m = typeExpr as { key: unknown; value: unknown };
      return `Map<${typeExprToString(m.key as Parameters<typeof typeExprToString>[0])}, ${typeExprToString(m.value as Parameters<typeof typeExprToString>[0])}>`;
    }
    case 'OptionType':
      return `${typeExprToString({ kind: 'SimpleType', name: (typeExpr as { inner: unknown }).inner as string })} | null`;
    case 'GenericType': {
      const g = typeExpr as { name: string; params: unknown[] };
      return `${g.name}<${g.params.map(p => typeExprToString(p as Parameters<typeof typeExprToString>[0])).join(', ')}>`;
    }
    default:
      return 'unknown';
  }
}
