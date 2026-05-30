// ═══════════════════════════════════════════════════════════
//  Cell Coding — Signal priority levels (Phase 2 bus)
//  신호 우선순위 (critical → low)
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';

export type SignalPriority = 'critical' | 'high' | 'normal' | 'low';

const PRIORITY_RANK: Record<SignalPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const DEFAULT_SIGNAL_PRIORITY: SignalPriority = 'normal';

/** Build signal type → priority map from program declarations. */
/** program 선언에서 신호 타입 → 우선순위 맵을 만든다. */
export function buildSignalPriorityMap(program: AST.Program): Map<string, SignalPriority> {
  const map = new Map<string, SignalPriority>();
  for (const decl of program.statements) {
    if (decl.kind !== 'SignalDecl') continue;
    map.set(decl.name, decl.priority ?? DEFAULT_SIGNAL_PRIORITY);
  }
  return map;
}

/** Lower rank = higher priority (processed first). */
/** rank가 낮을수록 우선 처리된다. */
export function priorityRank(priority: SignalPriority): number {
  return PRIORITY_RANK[priority];
}

export function priorityForType(
  map: Map<string, SignalPriority>,
  signalType: string,
): SignalPriority {
  return map.get(signalType) ?? DEFAULT_SIGNAL_PRIORITY;
}
