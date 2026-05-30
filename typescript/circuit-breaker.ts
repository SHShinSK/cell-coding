// ═══════════════════════════════════════════════════════════
//  Cell Coding — Immune circuit breaker (virtual time)
//  fault 누적 → open → halfOpen probe · 가상 시간 회로 차단
// ═══════════════════════════════════════════════════════════

import type { CircuitBreakerDecl } from './ast.js';

export type CircuitPhase = 'closed' | 'open' | 'halfOpen';

/** Virtual-time circuit breaker state machine. */
/** 가상 시간 기반 circuit breaker 상태 머신 */
export class CircuitBreakerManager {
  private faultTimes: number[] = [];
  private state: CircuitPhase = 'closed';
  private openUntilMs = 0;
  private halfOpenProbesLeft = 0;

  constructor(private readonly config: CircuitBreakerDecl) {}

  /** Reset for a new `send()` run · 새 send()마다 초기화 */
  reset(): void {
    this.faultTimes = [];
    this.state = 'closed';
    this.openUntilMs = 0;
    this.halfOpenProbesLeft = 0;
  }

  getPhase(nowMs: number): CircuitPhase {
    this.tick(nowMs);
    return this.state;
  }

  /** Advance open → halfOpen when virtual time elapses. */
  /** 가상 시간 경과 시 open → halfOpen 전환 */
  tick(nowMs: number): void {
    if (this.state === 'open' && nowMs >= this.openUntilMs) {
      this.state = 'halfOpen';
      this.halfOpenProbesLeft = this.config.probes;
    }
  }

  /** Record a fault; returns true when the breaker trips closed → open. */
  /** fault 기록; closed → open 전환 시 true */
  recordFault(nowMs: number): boolean {
    this.tick(nowMs);
    this.faultTimes.push(nowMs);
    const windowMs = this.config.windowSecs * 1000;
    this.faultTimes = this.faultTimes.filter(t => nowMs - t <= windowMs);

    if (this.state === 'halfOpen') {
      this.state = 'open';
      this.openUntilMs = nowMs + this.config.openSecs * 1000;
      this.halfOpenProbesLeft = 0;
      return false;
    }

    if (this.state === 'closed' && this.faultTimes.length >= this.config.threshold) {
      this.state = 'open';
      this.openUntilMs = nowMs + this.config.openSecs * 1000;
      return true;
    }

    return false;
  }

  /** Whether immune actions (retry/fallback) should be suppressed. */
  /** immune 동작(retry/fallback)을 차단해야 하는지 */
  blocksImmuneAction(nowMs: number): boolean {
    this.tick(nowMs);
    if (this.state === 'closed') return false;

    if (this.state === 'halfOpen') {
      if (this.halfOpenProbesLeft > 0) {
        this.halfOpenProbesLeft--;
        if (this.halfOpenProbesLeft === 0) {
          this.state = 'closed';
          this.faultTimes = [];
        }
        return false;
      }
      return true;
    }

    return true;
  }
}
