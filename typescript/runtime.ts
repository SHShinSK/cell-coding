// ═══════════════════════════════════════════════════════════
//  Cell Coding — Signal Runtime (Phase 2)
//  Executes a compiled Program: signal bus + cell handlers + immune.
//  컴파일된 Program을 실행한다: 신호 버스 + 세포 핸들러 + immune.
// ═══════════════════════════════════════════════════════════

import * as AST from './ast.js';
import {
  CellLifecycleManager,
  type LifecycleSnapshot,
  type RegisteredCellLifecycle,
} from './lifecycle.js';
import { computeBackoffMs } from './backoff.js';
import { buildOrganIndex, filterHandlersByOrganScope, type OrganIndex } from './nervous-routing.js';
import type { NervousFabric, NervousEnvelope } from './nervous-fabric.js';
import { CircuitBreakerManager } from './circuit-breaker.js';
import { DeadLetterStore, type DeadLetterEntry } from './dead-letter.js';
import {
  type SignalBusAdapter,
  InMemorySignalBus,
  freezeSignal,
  type SignalInstance,
} from './signal-bus.js';
import {
  buildSignalPriorityMap,
  priorityForType,
  type SignalPriority,
} from './signal-priority.js';

export type { SignalInstance };

export interface TraceEntry {
  /** Emitting cell, 'external', or 'immune:Policy#action' · 방출 주체 */
  from: string;
  signal: SignalInstance;
  /** Virtual elapsed ms at emit · 방출 시점 가상 경과(ms) */
  atMs?: number;
  /** Backoff wait before a scheduled retry · retry 예약 전 대기(ms) */
  backoffMs?: number;
}

export interface RuntimeOptions {
  /** External functions callable from handler bodies · 핸들러에서 호출 가능한 외부 함수 */
  functions?: Record<string, (...args: unknown[]) => unknown>;
  /** Max signals processed before aborting (loop guard) · 무한 루프 방지 상한 */
  maxSignals?: number;
  /** Only run handlers for these cells (Cell Lab isolation) · 격리 테스트 대상 세포 */
  activeCells?: string[];
  /** Skip organism immune policies · immune 정책 비활성화 */
  disableImmune?: boolean;
  /** Optional distributed bus adapter (default: in-memory priority queue) · 버스 어댑터 */
  signalBus?: SignalBusAdapter;
  /** Distributed nervous fabric for cross-organ routing · organ 간 nervous fabric */
  nervousFabric?: NervousFabric;
  /** Local organ name (validates fabric scope) · 로컬 organ */
  localOrgan?: string;
}

export type { CellLifecyclePhase, LifecycleTransition, LifecycleSnapshot } from './lifecycle.js';
export type { DeadLetterEntry };

type Scope = Record<string, unknown>;

interface RegisteredHandler {
  cell: string;
  signalType: string;
  paramName: string;
  body: AST.Stmt[];
  emits: Set<string>;
  /** transpiled TS handler · wire-up 시 AST body 대체 */
  invoke?: (signal: SignalInstance) => void;
}

interface RegisteredImmunePolicy {
  policyName: string;
  policy: AST.ImmunePolicyDecl;
}

interface PendingDelivery {
  signal: SignalInstance;
  from: string;
  priority: SignalPriority;
}

/** Standard escalation signal emitted when escalate:true · escalate 시 방출 신호 */
export const IMMUNE_ESCALATION_TYPE = 'ImmuneEscalation';

export class CellRuntime {
  private handlers: RegisteredHandler[] = [];
  private immunePolicies: RegisteredImmunePolicy[] = [];
  private lifecycle = new CellLifecycleManager();
  private functions: Record<string, (...args: unknown[]) => unknown>;
  private maxSignals: number;
  private organIndex: OrganIndex;
  private signalPriorities: Map<string, SignalPriority>;
  private bus: SignalBusAdapter;
  private deadLetters = new DeadLetterStore();
  private trace: TraceEntry[] = [];
  private processed = 0;
  private lastExternal: SignalInstance | null = null;
  private retryCounts = new Map<string, number>();
  private inApoptosisHook = false;
  private transpiledApoptosisHooks = new Map<string, () => void>();
  private virtualMs = 0;
  private scheduled: Array<{ atMs: number; signal: SignalInstance; from: string }> = [];
  private activeCells: Set<string> | null = null;
  private disableImmune = false;
  private circuitBreaker: CircuitBreakerManager | null = null;
  private busSeq = 0;
  private nervousFabric: NervousFabric | null = null;
  private suppressNervousPublish = false;

  constructor(program: AST.Program, opts: RuntimeOptions = {}) {
    this.functions = opts.functions ?? {};
    this.maxSignals = opts.maxSignals ?? 1000;
    this.disableImmune = opts.disableImmune ?? false;
    this.activeCells = opts.activeCells?.length ? new Set(opts.activeCells) : null;
    this.organIndex = buildOrganIndex(program);
    this.signalPriorities = buildSignalPriorityMap(program);
    this.bus = opts.signalBus ?? new InMemorySignalBus();
    this.nervousFabric = opts.nervousFabric ?? null;
    if (opts.localOrgan && opts.nervousFabric && opts.localOrgan !== opts.nervousFabric.localOrgan) {
      throw new Error(
        `localOrgan mismatch · localOrgan 불일치: ${opts.localOrgan} vs ${opts.nervousFabric.localOrgan}`,
      );
    }
    this.register(program);
  }

  // ── Registration · 등록 ──────────────────────────────────

  private register(program: AST.Program): void {
    const cells: RegisteredCellLifecycle[] = [];

    for (const decl of program.statements) {
      if (decl.kind === 'OrganismDecl' && decl.immune && !this.disableImmune) {
        if (decl.immune.circuit) {
          this.circuitBreaker = new CircuitBreakerManager(decl.immune.circuit);
        }
        for (const policy of decl.immune.policies) {
          this.immunePolicies.push({ policyName: decl.immune.name, policy });
        }
      }
      if (decl.kind !== 'CellDecl') continue;

      cells.push({ name: decl.name, apoptosis: decl.body.apoptosis });
      const emits = new Set(this.typeNames(decl.body.membrane.emits));
      for (const handler of decl.body.handlers) {
        this.handlers.push({
          cell: decl.name,
          signalType: handler.signalType,
          paramName: handler.paramName,
          body: handler.body,
          emits,
        });
      }
    }

    this.lifecycle.bootstrap(cells);
  }

  /** Current lifecycle states and transition log · 현재 생존 주기 상태·전이 로그 */
  getLifecycleSnapshot(): LifecycleSnapshot {
    return this.lifecycle.snapshot();
  }

  /** Stored dead letters after last send · 마지막 send 후 dead letter 목록 */
  getDeadLetters(): DeadLetterEntry[] {
    return this.deadLetters.all();
  }

  /** Current trace buffer · 현재 trace */
  getTrace(): TraceEntry[] {
    return [...this.trace];
  }

  /** transpiled handler로 AST body 대체 · wire-up */
  wireTranspiledHandlers(bindings: Array<{ cell: string; signalType: string; invoke: (signal: SignalInstance) => void }>): void {
    for (const binding of bindings) {
      const handler = this.handlers.find(
        h => h.cell === binding.cell && h.signalType === binding.signalType,
      );
      if (!handler) {
        throw new Error(
          `Handler not found · handler 없음: ${binding.cell}.on(${binding.signalType})`,
        );
      }
      handler.invoke = binding.invoke;
    }
  }

  /** transpiled apoptosis hook · wire-up */
  wireTranspiledApoptosis(hooks: Array<{ cell: string; invoke: () => void }>): void {
    for (const hook of hooks) {
      this.transpiledApoptosisHooks.set(hook.cell, hook.invoke);
    }
  }

  /** transpiled handler emit · 트랜스파일된 handler에서 신호 방출 */
  emitFromCell(cell: string, type: string, data: Record<string, unknown> = {}): void {
    if (this.lifecycle.isApoptotic(cell)) return;
    this.lifecycle.beginEmit(cell);
    this.enqueue({ type, data }, cell);
    this.lifecycle.endEmit(cell);
  }

  /** Process nervous ingress envelope (no trace reset) · nervous ingress 처리 */
  processNervousIngress(envelope: NervousEnvelope): TraceEntry[] {
    const start = this.trace.length;
    this.suppressNervousPublish = true;
    this.enqueue(envelope.signal, envelope.emitterCell);
    this.drain();
    this.suppressNervousPublish = false;
    return this.trace.slice(start);
  }

  /** Drain remote nervous ingress into local runtime · 원격 nervous ingress drain */
  async pollNervous(): Promise<TraceEntry[]> {
    if (!this.nervousFabric) return [];
    const reclaimed = await this.nervousFabric.autoClaimIngress();
    const fresh = await this.nervousFabric.drainIngress();
    const items = [...reclaimed, ...fresh];
    const merged: TraceEntry[] = [];
    for (const item of items) {
      merged.push(...this.processNervousIngress(item.envelope));
      await this.nervousFabric.ackIngress(item.stream, item.streamId);
    }
    return merged;
  }

  /** Force a cell into apoptosis (runs apoptosis hook if declared). */
  /** 세포를 apoptosis로 전환한다 (apoptosis 훅이 있으면 실행). */
  forceApoptosis(cell: string, reason = 'manual apoptosis · 수동 사멸'): void {
    this.runApoptosis(cell, reason);
  }

  private typeNames(type?: AST.TypeExpr): string[] {
    if (!type) return [];
    switch (type.kind) {
      case 'SimpleType':  return [type.name];
      case 'UnionType':   return type.types.flatMap(t => this.typeNames(t));
      case 'GenericType': return [type.name, ...type.params.flatMap(p => this.typeNames(p))];
      case 'ListType':    return this.typeNames(type.item);
      case 'MapType':     return [...this.typeNames(type.key), ...this.typeNames(type.value)];
      case 'OptionType':  return this.typeNames(type.inner);
      case 'ResultType':  return [...this.typeNames(type.ok), ...this.typeNames(type.err)];
      default:            return [];
    }
  }

  // ── Execution · 실행 ─────────────────────────────────────

  /** Inject an external signal and run the cascade to completion. */
  /** 외부 신호를 주입하고 연쇄 전파가 끝날 때까지 실행한다. */
  send(type: string, data: Record<string, unknown> = {}): TraceEntry[] {
    this.trace = [];
    this.processed = 0;
    this.bus.clear();
    this.deadLetters.clear();
    this.scheduled = [];
    this.virtualMs = 0;
    this.busSeq = 0;
    this.retryCounts.clear();
    this.circuitBreaker?.reset();
    this.lifecycle.resetForRun();
    this.lastExternal = { type, data };
    this.enqueue({ type, data }, 'external');
    this.drain();
    return this.trace;
  }

  /** Total virtual elapsed time after last send · 마지막 send 후 가상 경과 시간 */
  getVirtualElapsedMs(): number {
    return this.virtualMs;
  }

  /** Circuit breaker phase after last send · 마지막 send 후 circuit 상태 */
  getCircuitPhase(): 'closed' | 'open' | 'halfOpen' | null {
    if (!this.circuitBreaker) return null;
    return this.circuitBreaker.getPhase(this.virtualMs);
  }

  private advanceVirtualTime(nextMs: number): void {
    this.virtualMs = nextMs;
    this.circuitBreaker?.tick(this.virtualMs);
  }

  private enqueue(signal: SignalInstance, from: string): void {
    if (
      from !== 'external' &&
      !from.startsWith('immune:') &&
      !this.inApoptosisHook &&
      this.lifecycle.isApoptotic(from)
    ) {
      return;
    }
    const frozen = freezeSignal(signal);
    const priority = priorityForType(this.signalPriorities, frozen.type);
    this.trace.push({ from, signal: frozen, atMs: this.virtualMs });
    this.bus.enqueue({
      signal: frozen,
      from,
      priority,
      seq: ++this.busSeq,
    });

    if (
      this.nervousFabric &&
      !this.suppressNervousPublish &&
      from !== 'external' &&
      !from.startsWith('immune:')
    ) {
      this.nervousFabric.publishCrossOrgan(from, frozen, (expr, scope) => this.evalExpr(expr, scope));
    }
  }

  private scheduleAt(atMs: number, signal: SignalInstance, from: string): void {
    this.scheduled.push({ atMs, signal: freezeSignal(signal), from });
  }

  private promoteDueScheduled(): void {
    this.scheduled.sort((a, b) => a.atMs - b.atMs);
    while (this.scheduled.length > 0 && this.scheduled[0].atMs <= this.virtualMs) {
      const item = this.scheduled.shift()!;
      this.enqueue(item.signal, item.from);
    }
  }

  private handlersFor(
    signal: SignalInstance,
    from: string,
  ): Array<{ handler: RegisteredHandler; signal: SignalInstance }> {
    let scoped = filterHandlersByOrganScope(
      this.handlers,
      this.organIndex,
      signal,
      from,
      (expr, scope) => this.evalExpr(expr, scope),
    );
    if (this.activeCells) {
      scoped = scoped.filter(({ handler }) => this.activeCells!.has(handler.cell));
    }
    return scoped;
  }

  private storeDeadLetter(
    policyName: string,
    errorType: string,
    signal: SignalInstance,
    reason: string,
    faultCell?: string,
  ): void {
    this.deadLetters.store({
      signal,
      errorType,
      policyName,
      faultCell,
      atMs: this.virtualMs,
      reason,
    });
    this.trace.push({
      from: `immune:${policyName}#deadLetter:stored`,
      signal: {
        type: errorType,
        data: { stored: this.deadLetters.count(), reason },
      },
      atMs: this.virtualMs,
    });
  }

  private emitEscalation(
    policyName: string,
    errorType: string,
    reason: string,
    faultCell?: string,
  ): void {
    this.enqueue(
      {
        type: IMMUNE_ESCALATION_TYPE,
        data: { policyName, errorType, reason, faultCell },
      },
      `immune:${policyName}#escalate`,
    );
  }

  private drain(): void {
    while (this.bus.size() > 0 || this.scheduled.length > 0) {
      this.promoteDueScheduled();

      if (this.bus.size() === 0) {
        if (this.scheduled.length === 0) break;
        this.advanceVirtualTime(this.scheduled[0].atMs);
        continue;
      }

      if (++this.processed > this.maxSignals) {
        throw new Error(`Signal limit ${this.maxSignals} exceeded — possible cycle`);
      }

      const item = this.bus.dequeue()!;
      const { signal, from } = item;
      const scoped = this.handlersFor(signal, from);

      for (const { handler, signal: deliverySignal } of scoped) {
        if (!this.lifecycle.canReceive(handler.cell)) continue;
        this.runHandler(handler, deliverySignal);
      }
      this.applyImmune(signal);
    }
  }

  // ── Immune system · 면역 ───────────────────────────────────

  /** Apply organism immune policy when a fault signal appears. */
  /** fault 신호에 대해 organism immune 정책을 적용한다. */
  private applyImmune(signal: SignalInstance): void {
    for (const { policyName, policy } of this.immunePolicies) {
      if (policy.errorType !== signal.type) continue;

      if (this.circuitBreaker?.recordFault(this.virtualMs)) {
        this.trace.push({
          from: 'immune:CircuitBreaker#trip',
          signal: {
            type: signal.type,
            data: {
              faults: this.circuitBreaker.getPhase(this.virtualMs),
              atMs: this.virtualMs,
            },
          },
          atMs: this.virtualMs,
        });
      }

      if (
        this.circuitBreaker?.blocksImmuneAction(this.virtualMs) &&
        (policy.strategy === 'retry' || policy.strategy === 'fallback')
      ) {
        this.trace.push({
          from: 'immune:CircuitBreaker#reject',
          signal,
          atMs: this.virtualMs,
        });
        if (policy.escalate) {
          this.emitEscalation(
            policyName,
            policy.errorType,
            'circuit open · 회로 개방',
            this.findFaultEmitter(signal.type),
          );
        }
        return;
      }

      const key = `${policyName}:${policy.errorType}`;
      const attempts = this.retryCounts.get(key) ?? 0;
      const faultCell = this.findFaultEmitter(signal.type);

      switch (policy.strategy) {
        case 'retry': {
          const max = policy.retries ?? 3;
          if (attempts < max && this.lastExternal) {
            const attemptNum = attempts + 1;
            this.retryCounts.set(key, attemptNum);
            const delayMs = computeBackoffMs(policy.backoff, attemptNum);
            const retryFrom = `immune:${policyName}#retry:${attemptNum}`;
            const payload = {
              type: this.lastExternal.type,
              data: structuredClone(this.lastExternal.data),
            };

            if (delayMs > 0) {
              this.trace.push({
                from: `immune:${policyName}#backoff:${attemptNum}`,
                signal: { type: signal.type, data: { waitMs: delayMs } },
                atMs: this.virtualMs,
                backoffMs: delayMs,
              });
              this.scheduleAt(this.virtualMs + delayMs, payload, retryFrom);
            } else {
              this.enqueue(payload, retryFrom);
            }
          } else if (policy.escalate) {
            this.emitEscalation(
              policyName,
              policy.errorType,
              'retries exhausted · 재시도 소진',
              faultCell,
            );
          }
          break;
        }
        case 'fallback': {
          if (policy.fallback) {
            this.enqueue(
              { type: policy.fallback, data: {} },
              `immune:${policyName}#fallback`,
            );
          } else if (policy.escalate) {
            this.emitEscalation(
              policyName,
              policy.errorType,
              'fallback missing · fallback 없음',
              faultCell,
            );
          }
          break;
        }
        case 'quarantine':
        case 'isolate': {
          this.trace.push({
            from: `immune:${policyName}#${policy.strategy}`,
            signal,
          });
          if (faultCell) {
            this.runApoptosis(faultCell, `immune ${policy.strategy} · ${policyName}`);
          }
          if (policy.escalate) {
            this.emitEscalation(
              policyName,
              policy.errorType,
              policy.strategy,
              faultCell,
            );
          }
          break;
        }
        case 'deadLetter': {
          this.trace.push({
            from: `immune:${policyName}#deadLetter`,
            signal,
          });
          this.storeDeadLetter(
            policyName,
            policy.errorType,
            signal,
            'immune deadLetter · immune deadLetter',
            faultCell,
          );
          if (policy.escalate) {
            this.emitEscalation(
              policyName,
              policy.errorType,
              'deadLetter stored · deadLetter 저장',
              faultCell,
            );
          }
          break;
        }
      }
      return;
    }
  }

  // ── Interpreter · 인터프리터 ─────────────────────────────

  private findFaultEmitter(signalType: string): string | undefined {
    for (let i = this.trace.length - 1; i >= 0; i--) {
      const entry = this.trace[i];
      if (entry.signal.type !== signalType) continue;
      if (entry.from === 'external' || entry.from.startsWith('immune:')) continue;
      return entry.from;
    }
    return undefined;
  }

  private runApoptosis(cell: string, reason: string): void {
    const transpiled = this.transpiledApoptosisHooks.get(cell);
    if (transpiled) {
      this.inApoptosisHook = true;
      transpiled();
      this.inApoptosisHook = false;
    } else {
      const hook = this.lifecycle.getApoptosisHook(cell);
      if (hook?.length) {
        const pseudo: RegisteredHandler = {
          cell,
          signalType: '',
          paramName: '',
          body: hook,
          emits: new Set(),
        };
        this.inApoptosisHook = true;
        this.execStmts(hook, {}, pseudo);
        this.inApoptosisHook = false;
      }
    }
    this.lifecycle.commitApoptosis(cell, reason);
  }

  private runHandler(handler: RegisteredHandler, signal: SignalInstance): void {
    this.lifecycle.beginHandle(handler.cell);
    if (handler.invoke) {
      handler.invoke(signal);
    } else {
      const scope: Scope = { [handler.paramName]: signal.data };
      this.execStmts(handler.body, scope, handler);
    }
    this.lifecycle.endHandle(handler.cell);
  }

  private execStmts(stmts: AST.Stmt[], scope: Scope, handler: RegisteredHandler): void {
    for (const stmt of stmts) {
      this.execStmt(stmt, scope, handler);
    }
  }

  private execStmt(stmt: AST.Stmt, scope: Scope, handler: RegisteredHandler): void {
    switch (stmt.kind) {
      case 'EmitStmt': {
        if (this.lifecycle.isApoptotic(handler.cell)) break;
        this.lifecycle.beginEmit(handler.cell);
        const data: Record<string, unknown> = {};
        if (stmt.args) {
          for (const [key, expr] of Object.entries(stmt.args)) {
            data[key] = this.evalExpr(expr, scope);
          }
        }
        this.enqueue({ type: stmt.signalName, data }, handler.cell);
        this.lifecycle.endEmit(handler.cell);
        break;
      }
      case 'IfStmt': {
        if (this.truthy(this.evalExpr(stmt.condition, scope))) {
          this.execStmts(stmt.then, scope, handler);
        } else if (stmt.otherwise) {
          this.execStmts(stmt.otherwise, scope, handler);
        }
        break;
      }
      case 'LetStmt':
        scope[stmt.name] = this.evalExpr(stmt.value, scope);
        break;
      case 'ExprStmt':
        this.evalExpr(stmt.expr, scope);
        break;
      case 'AbsorbStmt':
      case 'ReturnStmt':
        break;
    }
  }

  private evalExpr(expr: AST.Expr, scope: Scope): unknown {
    switch (expr.kind) {
      case 'LiteralExpr':
        return expr.value;
      case 'IdentExpr':
        return scope[expr.name];
      case 'MemberExpr': {
        const obj = this.evalExpr(expr.object, scope);
        if (obj && typeof obj === 'object') {
          return (obj as Record<string, unknown>)[expr.prop];
        }
        return undefined;
      }
      case 'CallExpr': {
        const args = expr.args.map(a => this.evalExpr(a, scope));
        if (expr.callee.kind === 'IdentExpr') {
          const fn = this.functions[expr.callee.name];
          if (fn) return fn(...args);
        }
        return undefined;
      }
      case 'UnaryExpr':
        return expr.op === '!' ? !this.truthy(this.evalExpr(expr.expr, scope)) : undefined;
      case 'TernaryExpr':
        return this.truthy(this.evalExpr(expr.condition, scope))
          ? this.evalExpr(expr.then, scope)
          : this.evalExpr(expr.otherwise, scope);
      case 'BinaryExpr':
        return this.evalBinary(expr, scope);
      default:
        return undefined;
    }
  }

  private evalBinary(expr: AST.BinaryExpr, scope: Scope): unknown {
    const l = this.evalExpr(expr.left, scope) as never;
    const r = this.evalExpr(expr.right, scope) as never;
    switch (expr.op) {
      case '>':  return l > r;
      case '<':  return l < r;
      case '>=': return l >= r;
      case '<=': return l <= r;
      case '==': return l === r;
      case '!=': return l !== r;
      case '&&': return this.truthy(l) && this.truthy(r);
      case '||': return this.truthy(l) || this.truthy(r);
      case '+':  return (l as number) + (r as number);
      case '-':  return (l as number) - (r as number);
      case '*':  return (l as number) * (r as number);
      case '/':  return (l as number) / (r as number);
      default:   return undefined;
    }
  }

  private truthy(v: unknown): boolean {
    return Boolean(v);
  }
}
