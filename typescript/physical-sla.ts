// ═══════════════════════════════════════════════════════════
//  Cell Coding — Membrane Physical SLA (RFC-0001 Phase 2 runtime)
//  막 물리 SLA 런타임 enforcement · staleness / rate / latency
// ═══════════════════════════════════════════════════════════

import type { MembranePhysicalSla } from './ast.js';
import type { SignalInstance } from './signal-bus.js';

export const SLA_VIOLATION_TYPE = 'SlaViolation';
export const SLA_FAULT_TYPE = 'HardwareFault';

export interface SlaViolationRecord {
  kind: 'staleness' | 'rate' | 'latency';
  cell: string;
  limit: number;
  actual: number;
  policy: 'drop' | 'holdLastSafe' | 'emitFault';
}

export interface PhysicalTraceMeta {
  latencyMs?: number;
  sensorAgeMs?: number;
  streamSeq?: number;
  slaViolations?: SlaViolationRecord[];
}

export interface SlaAcceptVerdict {
  allow: boolean;
  sensorAgeMs?: number;
  violation?: SlaViolationRecord;
}

export interface SlaLatencyVerdict {
  latencyMs: number;
  violation?: SlaViolationRecord;
}

interface CellSlaState {
  acceptTimes: number[];
  lastSafeEmit: SignalInstance | null;
  streamSeq: number;
}

/** Sample timestamp age · 샘플 timestamp 경과(ms) */
export function sensorAgeMs(
  signal: SignalInstance,
  wallNowMs: number,
  virtualMs: number,
  mode: 'ingest' | 'sensor' = 'ingest',
): number | undefined {
  if (mode !== 'sensor') {
    const ingest = signal.ingestWallMs ?? signal.data.ingestWallMs;
    if (typeof ingest === 'number' && Number.isFinite(ingest)) {
      return Math.max(0, wallNowMs - ingest);
    }
  }
  const ts = signal.data.timestamp;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return undefined;
  if (ts > 1_000_000_000_000) return Math.max(0, wallNowMs - ts);
  return Math.max(0, virtualMs - ts);
}

export class PhysicalSlaGuard {
  private states = new Map<string, CellSlaState>();

  /** Reset SLA state for a new run/session · 실행 세션 SLA 상태 초기화 */
  reset(): void {
    this.states.clear();
  }

  private state(cell: string): CellSlaState {
    let s = this.states.get(cell);
    if (!s) {
      s = { acceptTimes: [], lastSafeEmit: null, streamSeq: 0 };
      this.states.set(cell, s);
    }
    return s;
  }

  nextStreamSeq(cell: string): number {
    const s = this.state(cell);
    s.streamSeq += 1;
    return s.streamSeq;
  }

  getLastSafeEmit(cell: string): SignalInstance | null {
    return this.state(cell).lastSafeEmit ?? null;
  }

  rememberSafeEmit(cell: string, signal: SignalInstance): void {
    this.state(cell).lastSafeEmit = {
      type: signal.type,
      data: structuredClone(signal.data),
    };
  }

  checkAccept(
    cell: string,
    signal: SignalInstance,
    sla: MembranePhysicalSla,
    virtualMs: number,
    wallNowMs: number,
    stalenessMode: 'ingest' | 'sensor' = 'ingest',
  ): SlaAcceptVerdict {
    const policy = sla.onViolation ?? 'drop';
    const age = sensorAgeMs(signal, wallNowMs, virtualMs, stalenessMode);

    if (
      sla.stalenessRejectMs != null &&
      age != null &&
      age > sla.stalenessRejectMs
    ) {
      return {
        allow: false,
        sensorAgeMs: age,
        violation: {
          kind: 'staleness',
          cell,
          limit: sla.stalenessRejectMs,
          actual: age,
          policy,
        },
      };
    }

    if (sla.rateMaxHz != null && sla.rateMaxHz > 0) {
      const st = this.state(cell);
      const windowStart = virtualMs - 1000;
      st.acceptTimes = st.acceptTimes.filter(t => t > windowStart);
      if (st.acceptTimes.length >= sla.rateMaxHz) {
        return {
          allow: false,
          sensorAgeMs: age,
          violation: {
            kind: 'rate',
            cell,
            limit: sla.rateMaxHz,
            actual: st.acceptTimes.length + 1,
            policy,
          },
        };
      }
      st.acceptTimes.push(virtualMs);
    }

    return { allow: true, sensorAgeMs: age };
  }

  checkLatency(
    cell: string,
    latencyMs: number,
    sla: MembranePhysicalSla,
  ): SlaLatencyVerdict {
    if (sla.latencyBudgetMs == null) {
      return { latencyMs };
    }
    if (latencyMs <= sla.latencyBudgetMs) {
      return { latencyMs };
    }
    return {
      latencyMs,
      violation: {
        kind: 'latency',
        cell,
        limit: sla.latencyBudgetMs,
        actual: Math.ceil(latencyMs),
        policy: sla.onViolation ?? 'drop',
      },
    };
  }

  buildViolationSignal(v: SlaViolationRecord): SignalInstance {
    return {
      type: SLA_VIOLATION_TYPE,
      data: {
        kind: v.kind,
        cell: v.cell,
        limit: v.limit,
        actual: v.actual,
        policy: v.policy,
      },
    };
  }

  buildFaultSignal(cell: string, violation: SlaViolationRecord): SignalInstance {
    return {
      type: SLA_FAULT_TYPE,
      data: {
        code: `SLA_${violation.kind.toUpperCase()}`,
        message: `${cell} ${violation.kind} SLA exceeded`,
        severity: 'warning',
      },
    };
  }
}
