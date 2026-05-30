// ═══════════════════════════════════════════════════════════
//  Cell Coding — Nervous organ-scoped signal routing
//  기관 내부 버스 + nervous 경로(조건·변환)로만 기관 간 전달
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';
import type { SignalInstance } from './signal-bus.js';
import { freezeSignal } from './signal-bus.js';

export interface OrganIndex {
  /** cell name → organ name · 세포 → 기관 */
  cellOrgan: Map<string, string>;
  /** "Organ.Signal" → target organ names · plain nervous 라우트 */
  nervousTargets: Map<string, string[]>;
  /** Full route declarations (when/always/transform) · 전체 라우트 선언 */
  routes: AST.RouteDecl[];
  /** organism declares nervous · nervous 선언 여부 */
  hasNervous: boolean;
}

/** Build organ membership and nervous route table from a program AST. */
/** program AST에서 기관 소속·nervous 라우트 테이블을 구성한다. */
export function buildOrganIndex(program: AST.Program): OrganIndex {
  const tissues = new Map<string, AST.TissueDecl>();
  const organs = new Map<string, AST.OrganDecl>();
  let organism: AST.OrganismDecl | undefined;

  for (const decl of program.statements) {
    if (decl.kind === 'TissueDecl') tissues.set(decl.name, decl);
    if (decl.kind === 'OrganDecl') organs.set(decl.name, decl);
    if (decl.kind === 'OrganismDecl') organism = decl;
  }

  const cellOrgan = new Map<string, string>();
  const nervousTargets = new Map<string, string[]>();
  const routes: AST.RouteDecl[] = [];

  if (organism) {
    for (const organName of organism.organs) {
      const organ = organs.get(organName);
      if (!organ) continue;
      for (const tissueName of organ.tissues) {
        const tissue = tissues.get(tissueName);
        if (!tissue?.flow) continue;
        for (const cellName of tissue.flow.steps) {
          cellOrgan.set(cellName, organName);
        }
      }
    }

    if (organism.nervous) {
      for (const route of organism.nervous.routes) {
        routes.push(route);
        if (route.branchKind === 'plain' && !route.transform) {
          const prev = nervousTargets.get(route.source) ?? [];
          nervousTargets.set(route.source, [...prev, ...route.targets]);
        }
      }
    }
  }

  return {
    cellOrgan,
    nervousTargets,
    routes,
    hasNervous: Boolean(organism?.nervous),
  };
}

/** External / immune injections bypass organ boundaries. */
/** external·immune 주입은 기관 경계를 넘는다. */
export function isGlobalDelivery(from: string): boolean {
  return from === 'external' || from.startsWith('immune:');
}

export type ExprEvaluator = (expr: AST.Expr, scope: Record<string, unknown>) => unknown;

function truthy(v: unknown): boolean {
  return Boolean(v);
}

function applyRouteTransform(
  transform: AST.RouteTransform | undefined,
  signal: SignalInstance,
  evalExpr: ExprEvaluator,
): SignalInstance {
  if (!transform) return freezeSignal(signal);
  const scope: Record<string, unknown> = { [transform.paramName]: signal.data };
  const data: Record<string, unknown> = {};
  if (transform.args) {
    for (const [key, expr] of Object.entries(transform.args)) {
      data[key] = evalExpr(expr, scope);
    }
  }
  return freezeSignal({ type: transform.signalType, data });
}

/** Per-organ signal variant after nervous routing · 기관별 전달 신호 */
export function resolveOrganDeliveries(
  index: OrganIndex,
  emitterCell: string,
  signal: SignalInstance,
  evalExpr: ExprEvaluator,
): Map<string, SignalInstance> {
  const frozen = freezeSignal(signal);
  const sourceOrgan = index.cellOrgan.get(emitterCell);
  if (!sourceOrgan) {
    return new Map([['*', frozen]]);
  }

  const deliveries = new Map<string, SignalInstance>();
  deliveries.set(sourceOrgan, frozen);

  const routeKey = `${sourceOrgan}.${signal.type}`;
  const scopedRoutes = index.routes.filter(r => r.source === routeKey);

  for (const route of scopedRoutes) {
    if (route.branchKind === 'when') {
      const scope: Record<string, unknown> = { p: frozen.data, ...frozen.data };
      if (!route.condition || !truthy(evalExpr(route.condition, scope))) continue;
    }

    const variant = applyRouteTransform(route.transform, frozen, evalExpr);
    for (const target of route.targets) {
      deliveries.set(target, variant);
    }
  }

  for (const target of index.nervousTargets.get(routeKey) ?? []) {
    if (!deliveries.has(target)) {
      deliveries.set(target, frozen);
    }
  }

  return deliveries;
}

/** Organs that may receive a cell emit (source organ + nervous targets). */
/** 세포 emit을 받을 수 있는 기관(송신 기관 + nervous 대상). */
export function eligibleOrgansForEmit(
  index: OrganIndex,
  emitterCell: string,
  signalType: string,
): Set<string> | 'global' {
  const sourceOrgan = index.cellOrgan.get(emitterCell);
  if (!sourceOrgan) return 'global';

  const organs = new Set<string>([sourceOrgan]);
  const routeKey = `${sourceOrgan}.${signalType}`;
  for (const target of index.nervousTargets.get(routeKey) ?? []) {
    organs.add(target);
  }
  for (const route of index.routes) {
    if (route.source !== routeKey) continue;
    for (const target of route.targets) organs.add(target);
  }
  return organs;
}

export interface RoutableHandler {
  cell: string;
  signalType: string;
}

export interface ScopedHandler<T extends RoutableHandler> {
  handler: T;
  signal: SignalInstance;
}

/** Filter handlers by organ scope and nervous transform for the current delivery. */
/** 현재 전달에 대해 기관 범위·nervous 변환으로 핸들러를 필터링한다. */
export function filterHandlersByOrganScope<T extends RoutableHandler>(
  handlers: T[],
  index: OrganIndex,
  signal: SignalInstance,
  from: string,
  evalExpr: ExprEvaluator,
): ScopedHandler<T>[] {
  if (isGlobalDelivery(from)) {
    const frozen = freezeSignal(signal);
    return handlers
      .filter(h => h.signalType === frozen.type)
      .map(handler => ({ handler, signal: frozen }));
  }

  const deliveries = resolveOrganDeliveries(index, from, signal, evalExpr);
  if (deliveries.has('*')) {
    const frozen = deliveries.get('*')!;
    return handlers
      .filter(h => h.signalType === frozen.type)
      .map(handler => ({ handler, signal: frozen }));
  }

  const result: ScopedHandler<T>[] = [];
  for (const handler of handlers) {
    const organ = index.cellOrgan.get(handler.cell);
    if (!organ) {
      if (handler.signalType === signal.type) {
        result.push({ handler, signal: freezeSignal(signal) });
      }
      continue;
    }
    const delivery = deliveries.get(organ);
    if (delivery && handler.signalType === delivery.type) {
      result.push({ handler, signal: delivery });
    }
  }
  return result;
}
