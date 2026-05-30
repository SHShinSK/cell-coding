// ═══════════════════════════════════════════════════════════
//  Cell Coding — Dead letter store (Phase 2 immune)
//  처리 불가 신호 보관소
// ═══════════════════════════════════════════════════════════

import type { SignalInstance } from './signal-bus.js';

export interface DeadLetterEntry {
  signal: SignalInstance;
  /** Fault or undeliverable signal type · fault/미전달 신호 타입 */
  errorType: string;
  /** Immune policy block name · immune 정책 이름 */
  policyName: string;
  /** Original emitter if known · 원래 방출 세포 */
  faultCell?: string;
  /** Virtual elapsed ms · 가상 경과(ms) */
  atMs: number;
  reason: string;
}

export class DeadLetterStore {
  private entries: DeadLetterEntry[] = [];

  store(entry: DeadLetterEntry): void {
    this.entries.push({
      ...entry,
      signal: {
        type: entry.signal.type,
        data: structuredClone(entry.signal.data),
      },
    });
  }

  /** All stored dead letters (copy) · 저장된 dead letter 전체(복사본) */
  all(): DeadLetterEntry[] {
    return this.entries.map(e => ({
      ...e,
      signal: { type: e.signal.type, data: structuredClone(e.signal.data) },
    }));
  }

  count(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}
