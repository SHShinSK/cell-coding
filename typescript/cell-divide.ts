// ═══════════════════════════════════════════════════════════
//  Cell Coding — Cell divide / horizontal scaling (Phase 4+)
//  divide when (queue.depth > N) → replica 권장 · K8s HPA
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';
import { buildOrganIndex } from './nervous-routing.js';

export interface DividePolicy {
  cellName: string;
  organName?: string;
  condition: AST.Expr;
  max: number;
  strategy: AST.DivideDecl['strategy'];
}

export interface DivideRecommendation {
  cell: string;
  organ?: string;
  replicas: number;
  max: number;
  shouldScale: boolean;
  strategy: DividePolicy['strategy'];
  queueDepth: number;
  /** strategy 기반 대상 replica index (0..replicas-1) */
  targetReplica: number;
}

export interface OrganHpaSpec {
  organ: string;
  minReplicas: number;
  maxReplicas: number;
  targetQueueDepth: number;
}

/** divide strategy 라우팅 · round-robin / least-loaded / random */
export class DivideBalancer {
  private roundRobinCursor = 0;
  private replicaLoads = new Map<number, number>();
  private randomFn: () => number;

  constructor(randomFn: () => number = Math.random) {
    this.randomFn = randomFn;
  }

  /** replica별 부하 스냅샷 (least-loaded) */
  setReplicaLoads(loads: number[]): void {
    this.replicaLoads.clear();
    loads.forEach((load, i) => this.replicaLoads.set(i, load));
  }

  getReplicaLoad(replica: number): number {
    return this.replicaLoads.get(replica) ?? 0;
  }

  /** dispatch 후 부하 증가 (PoC · least-loaded 추적) */
  recordDispatch(replica: number, weight = 1): void {
    this.replicaLoads.set(replica, this.getReplicaLoad(replica) + weight);
  }

  reset(): void {
    this.roundRobinCursor = 0;
    this.replicaLoads.clear();
  }

  pickReplica(
    strategy: DividePolicy['strategy'],
    replicaCount: number,
    opts?: { dryRun?: boolean },
  ): number {
    if (replicaCount <= 1) return 0;

    switch (strategy) {
      case 'round-robin': {
        const idx = this.roundRobinCursor % replicaCount;
        if (!opts?.dryRun) this.roundRobinCursor++;
        return idx;
      }
      case 'least-loaded': {
        let best = 0;
        let minLoad = Infinity;
        for (let i = 0; i < replicaCount; i++) {
          const load = this.getReplicaLoad(i);
          if (load < minLoad) {
            minLoad = load;
            best = i;
          }
        }
        return best;
      }
      case 'random':
        return Math.floor(this.randomFn() * replicaCount);
      default:
        return 0;
    }
  }
}

function truthy(v: unknown): boolean {
  return Boolean(v);
}

function evalExpr(expr: AST.Expr, scope: Record<string, unknown>): unknown {
  switch (expr.kind) {
    case 'LiteralExpr':
      return expr.value;
    case 'IdentExpr':
      return scope[expr.name];
    case 'MemberExpr': {
      const obj = evalExpr(expr.object, scope);
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[expr.prop];
      }
      return undefined;
    }
    case 'UnaryExpr':
      return expr.op === '!' ? !truthy(evalExpr(expr.expr, scope)) : undefined;
    case 'TernaryExpr':
      return truthy(evalExpr(expr.condition, scope))
        ? evalExpr(expr.then, scope)
        : evalExpr(expr.otherwise, scope);
    case 'BinaryExpr': {
      const l = evalExpr(expr.left, scope) as never;
      const r = evalExpr(expr.right, scope) as never;
      switch (expr.op) {
        case '>': return l > r;
        case '<': return l < r;
        case '>=': return l >= r;
        case '<=': return l <= r;
        case '==': return l === r;
        case '!=': return l !== r;
        case '&&': return truthy(l) && truthy(r);
        case '||': return truthy(l) || truthy(r);
        default: return undefined;
      }
    }
    default:
      return undefined;
  }
}

/** divide 조건에서 queue.depth 임계값 추출 (PoC) */
export function extractQueueThreshold(condition: AST.Expr): number | undefined {
  if (condition.kind !== 'BinaryExpr') return undefined;
  if (!['>', '>='].includes(condition.op)) return undefined;
  const left = condition.left;
  if (
    left.kind === 'MemberExpr' &&
    left.object.kind === 'IdentExpr' &&
    left.object.name === 'queue' &&
    left.prop === 'depth'
  ) {
    const right = condition.right;
    if (right.kind === 'LiteralExpr' && typeof right.value === 'number') {
      return right.value;
    }
  }
  return undefined;
}

/** Program AST에서 divide 정책 추출 */
export function extractDividePolicies(program: AST.Program): DividePolicy[] {
  const index = buildOrganIndex(program);
  const policies: DividePolicy[] = [];

  for (const decl of program.statements) {
    if (decl.kind !== 'CellDecl' || !decl.body.divide) continue;
    policies.push({
      cellName: decl.name,
      organName: index.cellOrgan.get(decl.name),
      condition: decl.body.divide.condition,
      max: decl.body.divide.max,
      strategy: decl.body.divide.strategy,
    });
  }

  return policies;
}

export function dividePoliciesForOrgan(policies: DividePolicy[], organ: string): DividePolicy[] {
  return policies.filter(p => p.organName === organ);
}

/** queue.depth 기준 divide 조건 평가 */
export function evalDivideCondition(condition: AST.Expr, queueDepth: number): boolean {
  return truthy(evalExpr(condition, { queue: { depth: queueDepth } }));
}

/** 버스 깊이 + strategy 로 replica 권장 및 targetReplica 선택 */
export function recommendReplicas(
  policies: DividePolicy[],
  queueDepth: number,
  opts?: { balancer?: DivideBalancer; recordRoute?: boolean },
): DivideRecommendation[] {
  return policies.map(p => buildRecommendation(p, queueDepth, opts));
}

/** Redis coordinator 기반 async replica 권장 */
export async function recommendReplicasAsync(
  policies: DividePolicy[],
  queueDepth: number,
  opts: {
    coordinator: DivideCoordinatorLike;
    organ: string;
    replicaCount: number;
    recordRoute?: boolean;
  },
): Promise<DivideRecommendation[]> {
  const loads = await opts.coordinator.fetchReplicaLoads(opts.organ, opts.replicaCount);
  const balancer = new DivideBalancer();
  balancer.setReplicaLoads(loads);

  const out: DivideRecommendation[] = [];
  for (const p of policies) {
    const rec = buildRecommendation(p, queueDepth, {
      balancer,
      recordRoute: false,
      replicaCap: opts.replicaCount,
    });
    rec.targetReplica = await opts.coordinator.pickReplica(
      opts.organ,
      p.strategy,
      rec.replicas,
      !opts.recordRoute,
    );
    if (opts.recordRoute && rec.shouldScale) {
      await opts.coordinator.recordDispatch(opts.organ, rec.targetReplica);
    }
    out.push(rec);
  }
  return out;
}

/** coordinator 최소 인터페이스 (순환 import 방지) */
export interface DivideCoordinatorLike {
  pickReplica(
    organ: string,
    strategy: DividePolicy['strategy'],
    replicaCount: number,
    dryRun?: boolean,
  ): Promise<number>;
  recordDispatch(organ: string, replica: number, weight?: number): Promise<void>;
  fetchReplicaLoads(organ: string, replicaCount: number): Promise<number[]>;
}

function buildRecommendation(
  p: DividePolicy,
  queueDepth: number,
  opts?: { balancer?: DivideBalancer; recordRoute?: boolean; replicaCap?: number },
): DivideRecommendation {
  const shouldScale = evalDivideCondition(p.condition, queueDepth);
  const threshold = extractQueueThreshold(p.condition) ?? 100;
  let replicas = shouldScale
    ? Math.min(p.max, Math.max(1, Math.ceil(queueDepth / threshold)))
    : 1;
  if (opts?.replicaCap) {
    replicas = Math.min(replicas, opts.replicaCap);
  }
  const targetReplica =
    opts?.balancer?.pickReplica(p.strategy, replicas, { dryRun: !opts.recordRoute }) ?? 0;
  if (opts?.balancer && opts.recordRoute && shouldScale) {
    opts.balancer.recordDispatch(targetReplica);
  }
  return {
    cell: p.cellName,
    organ: p.organName,
    replicas,
    max: p.max,
    shouldScale,
    strategy: p.strategy,
    queueDepth,
    targetReplica,
  };
}

/** organ 단위 HPA bounds (divide 정책 집계) */
export function organHpaSpec(policies: DividePolicy[], organ: string): OrganHpaSpec | null {
  const scoped = dividePoliciesForOrgan(policies, organ);
  if (!scoped.length) return null;

  const thresholds = scoped
    .map(p => extractQueueThreshold(p.condition))
    .filter((n): n is number => n !== undefined);

  return {
    organ,
    minReplicas: 1,
    maxReplicas: Math.max(...scoped.map(p => p.max)),
    targetQueueDepth: thresholds.length ? Math.min(...thresholds) : 100,
  };
}
