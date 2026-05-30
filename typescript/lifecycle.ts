// ═══════════════════════════════════════════════════════════
//  Cell Coding — Cell lifecycle state machine (Phase 2)
//  genesis → dormant → active → emitting → dormant → apoptosis
//  genesis → dormant → active → emitting → dormant → apoptosis
// ═══════════════════════════════════════════════════════════

import type { ApoptosisDecl, Stmt } from './ast.js';

/** Runtime lifecycle phase per spec §2 · 스펙 §2 생존 주기 */
export type CellLifecyclePhase =
  | 'genesis'
  | 'dormant'
  | 'active'
  | 'emitting'
  | 'apoptosis';

export interface LifecycleTransition {
  cell: string;
  from: CellLifecyclePhase;
  to: CellLifecyclePhase;
  reason: string;
  /** Monotonic step counter within a run · 실행 내 단계 번호 */
  step: number;
}

export interface RegisteredCellLifecycle {
  name: string;
  apoptosis?: ApoptosisDecl;
}

export interface LifecycleSnapshot {
  states: Record<string, CellLifecyclePhase>;
  transitions: LifecycleTransition[];
}

const RECEIVABLE: ReadonlySet<CellLifecyclePhase> = new Set(['dormant', 'active']);

export class CellLifecycleManager {
  private states = new Map<string, CellLifecyclePhase>();
  private transitions: LifecycleTransition[] = [];
  private apoptosisBodies = new Map<string, Stmt[]>();
  private step = 0;

  /** Register cells and run genesis → dormant bootstrap. */
  /** 세포를 등록하고 genesis → dormant 초기화를 수행한다. */
  bootstrap(cells: RegisteredCellLifecycle[]): void {
    this.states.clear();
    this.transitions = [];
    this.apoptosisBodies.clear();
    this.step = 0;

    for (const cell of cells) {
      this.states.set(cell.name, 'genesis');
      if (cell.apoptosis) {
        this.apoptosisBodies.set(cell.name, cell.apoptosis.body);
      }
      this.record(cell.name, 'genesis', 'dormant', 'bootstrap complete · 초기화 완료');
    }
  }

  /** Reset all living cells to dormant for a new signal run. */
  /** 새 신호 실행을 위해 살아 있는 세포를 dormant로 리셋한다. */
  resetForRun(): void {
    for (const [name, phase] of this.states) {
      if (phase === 'apoptosis') continue;
      if (phase !== 'dormant') {
        this.record(name, phase, 'dormant', 'await signal · 신호 대기');
      }
    }
  }

  canReceive(cell: string): boolean {
    const phase = this.states.get(cell);
    return phase !== undefined && RECEIVABLE.has(phase);
  }

  isApoptotic(cell: string): boolean {
    return this.states.get(cell) === 'apoptosis';
  }

  getPhase(cell: string): CellLifecyclePhase | undefined {
    return this.states.get(cell);
  }

  /** Signal matched — dormant/active → active. */
  /** 신호 수신 — dormant/active → active */
  beginHandle(cell: string): void {
    const phase = this.states.get(cell);
    if (!phase || phase === 'apoptosis') return;
    if (phase !== 'active') {
      this.record(cell, phase, 'active', 'processing signal · 신호 처리');
    }
  }

  /** Handler finished — active/emitting → dormant. */
  /** 핸들러 종료 — active/emitting → dormant */
  endHandle(cell: string): void {
    const phase = this.states.get(cell);
    if (!phase || phase === 'apoptosis') return;
    if (phase !== 'dormant') {
      this.record(cell, phase, 'dormant', 'handler complete · 핸들러 완료');
    }
  }

  /** Emit in progress — active → emitting. */
  /** 방출 중 — active → emitting */
  beginEmit(cell: string): void {
    const phase = this.states.get(cell);
    if (!phase || phase === 'apoptosis') return;
    if (phase !== 'emitting') {
      this.record(cell, phase, 'emitting', 'emitting signal · 신호 방출');
    }
  }

  /** After enqueue — emitting → active (still inside handler). */
  /** enqueue 후 — emitting → active (핸들러 내부) */
  endEmit(cell: string): void {
    const phase = this.states.get(cell);
    if (!phase || phase === 'apoptosis') return;
    if (phase === 'emitting') {
      this.record(cell, 'emitting', 'active', 'resume handler · 핸들러 재개');
    }
  }

  /** Returns apoptosis hook body without transitioning yet. */
  /** 아직 전환하지 않고 apoptosis 훅 본문을 반환한다. */
  getApoptosisHook(cell: string): Stmt[] | undefined {
    if (this.states.get(cell) === 'apoptosis') return undefined;
    return this.apoptosisBodies.get(cell);
  }

  /** Terminate cell after optional hook execution. */
  /** (선택) 훅 실행 후 세포를 종료한다. */
  commitApoptosis(cell: string, reason: string): void {
    const phase = this.states.get(cell);
    if (!phase || phase === 'apoptosis') return;
    this.record(cell, phase, 'apoptosis', reason);
  }

  /** @deprecated Use getApoptosisHook + commitApoptosis */
  apoptose(cell: string, reason: string): Stmt[] | undefined {
    const hook = this.getApoptosisHook(cell);
    this.commitApoptosis(cell, reason);
    return hook;
  }

  snapshot(): LifecycleSnapshot {
    const states: Record<string, CellLifecyclePhase> = {};
    for (const [name, phase] of this.states) states[name] = phase;
    return { states, transitions: [...this.transitions] };
  }

  private record(
    cell: string,
    from: CellLifecyclePhase,
    to: CellLifecyclePhase,
    reason: string,
  ): void {
    if (from === to) return;
    this.step += 1;
    this.states.set(cell, to);
    this.transitions.push({ cell, from, to, reason, step: this.step });
  }
}
