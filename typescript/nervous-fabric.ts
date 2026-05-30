// ═══════════════════════════════════════════════════════════
//  Cell Coding — Distributed nervous fabric (Phase 4+)
//  organ 간 nervous 라우트 → Redis Streams Consumer Group ingress
// ═══════════════════════════════════════════════════════════

import { hostname } from 'node:os';
import type * as AST from './ast.js';
import type { SignalInstance } from './signal-bus.js';
import { freezeSignal } from './signal-bus.js';
import {
  buildOrganIndex,
  resolveOrganDeliveries,
  type ExprEvaluator,
  type OrganIndex,
} from './nervous-routing.js';
import type { RedisStreamsClient, StreamEntry } from './signal-bus-streams.js';

export interface NervousEnvelope {
  sourceOrgan: string;
  targetOrgan: string;
  emitterCell: string;
  signal: SignalInstance;
  atMs: number;
}

/** Consumer Group ingress item (ack after 처리) · ingress + stream ID */
export interface NervousIngress {
  stream: string;
  streamId: string;
  envelope: NervousEnvelope;
}

export interface NervousFabricStats {
  localOrgan: string;
  consumerGroup: string;
  consumerName: string;
  published: number;
  consumed: number;
  acked: number;
  /** XAUTOCLAIM 으로 재할당된 ingress 수 */
  reclaimed: number;
  pending: number;
  lastIngressId: string;
  autoClaimMinIdleMs: number;
  autoClaimEnabled: boolean;
}

export interface NervousFabricOptions {
  client: RedisStreamsClient;
  localOrgan: string;
  organIndex?: OrganIndex;
  program?: AST.Program;
  streamPrefix?: string;
  consumerGroup?: string;
  consumerName?: string;
  /** false면 legacy xReadAfter (테스트/호환) · 기본 Consumer Group */
  useConsumerGroup?: boolean;
  /** XAUTOCLAIM min idle (ms) · PEL stuck 복구 */
  autoClaimMinIdleMs?: number;
  /** false 면 XAUTOCLAIM 비활성 · 기본 on (Consumer Group) */
  autoClaimEnabled?: boolean;
}

const DEFAULT_GROUP = 'cell-nervous';

/** 기본 consumer 이름 · organ-host-pid */
export function defaultNervousConsumerName(organ: string): string {
  return process.env.CELL_CONSUMER_NAME ?? `${organ}-${hostname()}-${process.pid}`;
}

/** organ ingress stream key · 기관별 nervous ingress 스트림 */
export function nervousStreamKey(organName: string, prefix = 'cell:nervous'): string {
  return `${prefix}:${organName}`;
}

export function parseNervousEnvelope(entry: StreamEntry): NervousEnvelope | undefined {
  const raw = entry.fields.payload;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as NervousEnvelope;
    if (!parsed.sourceOrgan || !parsed.targetOrgan || !parsed.emitterCell || !parsed.signal?.type) {
      return undefined;
    }
    return {
      ...parsed,
      signal: freezeSignal(parsed.signal),
    };
  } catch {
    return undefined;
  }
}

/** Redis Streams Consumer Group 기반 organ 간 nervous fabric */
export class NervousFabric {
  private index: OrganIndex;
  private lastIngressId = '0';
  private published = 0;
  private consumed = 0;
  private acked = 0;
  private reclaimed = 0;
  private prefix: string;
  private consumerGroup: string;
  private consumerName: string;
  private useConsumerGroup: boolean;
  private autoClaimMinIdleMs: number;
  private autoClaimEnabled: boolean;
  private groupReady = false;

  constructor(private opts: NervousFabricOptions) {
    this.index = opts.organIndex ?? (opts.program ? buildOrganIndex(opts.program) : buildOrganIndex({ kind: 'Program', statements: [] }));
    this.prefix = opts.streamPrefix ?? 'cell:nervous';
    this.consumerGroup = opts.consumerGroup ?? process.env.CELL_NERVOUS_GROUP ?? DEFAULT_GROUP;
    this.consumerName = opts.consumerName ?? defaultNervousConsumerName(opts.localOrgan);
    this.useConsumerGroup = opts.useConsumerGroup ?? true;
    this.autoClaimMinIdleMs = opts.autoClaimMinIdleMs ?? Number(process.env.CELL_NERVOUS_CLAIM_MS ?? 30000);
    const autoFlag = process.env.CELL_NERVOUS_AUTOCLAIM?.toLowerCase();
    this.autoClaimEnabled = opts.autoClaimEnabled ?? !(autoFlag === '0' || autoFlag === 'false' || autoFlag === 'no');
  }

  get localOrgan(): string {
    return this.opts.localOrgan;
  }

  async stats(): Promise<NervousFabricStats> {
    const stream = nervousStreamKey(this.opts.localOrgan, this.prefix);
    const pending = this.useConsumerGroup && this.opts.client.xPendingCount
      ? await this.opts.client.xPendingCount(stream, this.consumerGroup)
      : 0;

    return {
      localOrgan: this.opts.localOrgan,
      consumerGroup: this.consumerGroup,
      consumerName: this.consumerName,
      published: this.published,
      consumed: this.consumed,
      acked: this.acked,
      reclaimed: this.reclaimed,
      pending,
      lastIngressId: this.lastIngressId,
      autoClaimMinIdleMs: this.autoClaimMinIdleMs,
      autoClaimEnabled: this.autoClaimEnabled,
    };
  }

  /** sync stats snapshot (pending=0) · 동기 stats (테스트용) */
  statsSync(): Omit<NervousFabricStats, 'pending'> & { pending: number } {
    return {
      localOrgan: this.opts.localOrgan,
      consumerGroup: this.consumerGroup,
      consumerName: this.consumerName,
      published: this.published,
      consumed: this.consumed,
      acked: this.acked,
      reclaimed: this.reclaimed,
      pending: 0,
      lastIngressId: this.lastIngressId,
      autoClaimMinIdleMs: this.autoClaimMinIdleMs,
      autoClaimEnabled: this.autoClaimEnabled,
    };
  }

  private async ensureConsumerGroup(stream: string): Promise<void> {
    if (this.groupReady || !this.useConsumerGroup) return;
    await this.opts.client.xGroupCreate(stream, this.consumerGroup, '0', true);
    this.groupReady = true;
  }

  /** Emit 후 원격 organ 대상 nervous publish · 원격 organ으로 publish */
  publishCrossOrgan(
    emitterCell: string,
    signal: SignalInstance,
    evalExpr: ExprEvaluator,
  ): NervousEnvelope[] {
    const sourceOrgan = this.index.cellOrgan.get(emitterCell);
    if (!sourceOrgan) return [];

    const deliveries = resolveOrganDeliveries(this.index, emitterCell, signal, evalExpr);
    const outbound: NervousEnvelope[] = [];

    for (const [targetOrgan, variant] of deliveries) {
      if (targetOrgan === '*' || targetOrgan === this.opts.localOrgan) continue;

      const envelope: NervousEnvelope = {
        sourceOrgan,
        targetOrgan,
        emitterCell,
        signal: variant,
        atMs: Date.now(),
      };

      void Promise.resolve(
        this.opts.client.xAdd(nervousStreamKey(targetOrgan, this.prefix), {
          payload: JSON.stringify(envelope),
          type: variant.type,
          source: sourceOrgan,
          target: targetOrgan,
          emitter: emitterCell,
        }),
      );
      this.published++;
      outbound.push(envelope);
    }

    return outbound;
  }

  /** PEL stuck 메시지 XAUTOCLAIM · 다른 consumer가 재처리 */
  async autoClaimIngress(minIdleMs?: number, limit = 100): Promise<NervousIngress[]> {
    if (!this.useConsumerGroup || !this.autoClaimEnabled || !this.opts.client.xAutoClaim) {
      return [];
    }

    const stream = nervousStreamKey(this.opts.localOrgan, this.prefix);
    await this.ensureConsumerGroup(stream);

    const idle = minIdleMs ?? this.autoClaimMinIdleMs;
    let startId = '0-0';
    const ingress: NervousIngress[] = [];

    for (;;) {
      const { entries, nextStart } = await this.opts.client.xAutoClaim(
        stream,
        this.consumerGroup,
        this.consumerName,
        idle,
        startId,
        limit - ingress.length,
      );

      for (const entry of entries) {
        const env = parseNervousEnvelope(entry);
        this.lastIngressId = entry.id;

        if (!env || env.targetOrgan !== this.opts.localOrgan) {
          await this.opts.client.xAck(stream, this.consumerGroup, entry.id);
          continue;
        }

        ingress.push({ stream, streamId: entry.id, envelope: env });
        this.consumed++;
        this.reclaimed++;
      }

      if (ingress.length >= limit || entries.length === 0 || nextStart === '0-0') break;
      startId = nextStart;
    }

    return ingress;
  }

  /** 로컬 organ ingress drain (Consumer Group) · ingress 수신 */
  async drainIngress(limit = 100): Promise<NervousIngress[]> {
    const stream = nervousStreamKey(this.opts.localOrgan, this.prefix);
    const entries = this.useConsumerGroup
      ? await this.readGroupEntries(stream, limit)
      : await this.opts.client.xReadAfter(stream, this.lastIngressId, limit);

    const ingress: NervousIngress[] = [];

    for (const entry of entries) {
      const env = parseNervousEnvelope(entry);
      this.lastIngressId = entry.id;

      if (!env || env.targetOrgan !== this.opts.localOrgan) {
        if (this.useConsumerGroup) {
          await this.opts.client.xAck(stream, this.consumerGroup, entry.id);
        }
        continue;
      }

      ingress.push({ stream, streamId: entry.id, envelope: env });
      this.consumed++;
    }

    return ingress;
  }

  private async readGroupEntries(stream: string, limit: number): Promise<StreamEntry[]> {
    await this.ensureConsumerGroup(stream);
    return this.opts.client.xReadGroup(stream, this.consumerGroup, this.consumerName, limit);
  }

  /** 처리 완료 후 XACK · Consumer Group ACK */
  async ackIngress(stream: string, streamId: string): Promise<void> {
    if (!this.useConsumerGroup) return;
    const n = await this.opts.client.xAck(stream, this.consumerGroup, streamId);
    if (n > 0) this.acked += n;
  }
}

export type { OrganIndex };
