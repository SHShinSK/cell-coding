// ═══════════════════════════════════════════════════════════
//  Cell Coding — External signal payload validation
//  외부 입력 신호 페이로드 검증
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';

type SignalFields = Map<string, AST.SignalDecl>;

const SCALARS: Record<string, (v: unknown) => boolean> = {
  Number: v => typeof v === 'number' && Number.isFinite(v),
  String: v => typeof v === 'string',
  Boolean: v => typeof v === 'boolean',
};

export class SignalPayloadError extends Error {
  constructor(
    public readonly signalType: string,
    public readonly problems: string[],
  ) {
    super(`Invalid payload for ${signalType} · 잘못된 페이로드: ${problems.join('; ')}`);
    this.name = 'SignalPayloadError';
  }
}

export function buildSignalIndex(program: AST.Program): SignalFields {
  const index: SignalFields = new Map();
  for (const decl of program.statements) {
    if (decl.kind === 'SignalDecl') index.set(decl.name, decl);
  }
  return index;
}

/** Own fields plus inherited ones; a child field wins · 상속 필드 포함, 자식 우선 */
function collectFields(index: SignalFields, type: string): Map<string, AST.FieldDecl> {
  const chain: AST.SignalDecl[] = [];
  const seen = new Set<string>();
  let current = index.get(type);
  while (current && !seen.has(current.name)) {
    seen.add(current.name);
    chain.unshift(current);
    current = current.extends ? index.get(current.extends) : undefined;
  }
  const fields = new Map<string, AST.FieldDecl>();
  for (const decl of chain) {
    for (const field of decl.fields) fields.set(field.name, field);
  }
  return fields;
}

/**
 * Checks declared required fields and scalar types. Extra fields and
 * non-scalar types pass; undeclared signal types are not checked.
 * 선언된 필수 필드와 스칼라 타입만 검사한다. 추가 필드, 비스칼라 타입,
 * 선언되지 않은 신호는 통과한다.
 */
export function payloadProblems(
  index: SignalFields,
  type: string,
  data: Record<string, unknown>,
): string[] {
  const problems: string[] = [];
  for (const [name, field] of collectFields(index, type)) {
    const value = data[name];
    if (value === undefined || value === null) {
      const optional =
        field.optional || field.default !== undefined || field.typeExpr.kind === 'OptionType';
      if (!optional) problems.push(`missing field '${name}'`);
      continue;
    }
    if (field.typeExpr.kind !== 'SimpleType') continue;
    const check = SCALARS[field.typeExpr.name];
    if (check && !check(value)) {
      problems.push(`field '${name}' must be ${field.typeExpr.name}`);
    }
  }
  return problems;
}
