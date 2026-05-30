// ═══════════════════════════════════════════════════════════
//  Cell Coding — Prometheus metrics export (Phase 4+)
//  HPA external metric cell_signal_queue_depth · 큐 깊이 노출
// ═══════════════════════════════════════════════════════════

import type { DivideRecommendation } from './cell-divide.js';
import type { NervousFabricStats } from './nervous-fabric.js';

export interface CellMetricsSnapshot {
  organ?: string;
  replica?: number;
  queueDepth: number;
  divide?: DivideRecommendation[];
  nervous?: NervousFabricStats | null;
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function gauge(name: string, help: string, labels: Record<string, string>, value: number): string {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${escapeLabel(v)}"`)
    .join(',');
  const suffix = labelStr ? `{${labelStr}}` : '';
  return [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} gauge`,
    `${name}${suffix} ${Number.isFinite(value) ? value : 0}`,
  ].join('\n');
}

/** Prometheus text exposition · HPA용 cell_signal_queue_depth */
export function formatPrometheusMetrics(snapshot: CellMetricsSnapshot): string {
  const lines: string[] = [];
  const organ = snapshot.organ ?? 'unknown';
  const baseLabels: Record<string, string> = { organ };
  if (snapshot.replica !== undefined) {
    baseLabels.replica = String(snapshot.replica);
  }

  lines.push(
    gauge(
      'cell_signal_queue_depth',
      'Organ signal bus queue depth for HPA scaling · organ 큐 깊이',
      baseLabels,
      snapshot.queueDepth,
    ),
  );

  if (snapshot.divide?.length) {
    for (const rec of snapshot.divide) {
      lines.push(
        gauge(
          'cell_divide_replicas_recommended',
          'Recommended replicas from divide policy · divide replica 권장',
          {
            organ,
            cell: rec.cell,
            strategy: rec.strategy,
          },
          rec.replicas,
        ),
      );
      lines.push(
        gauge(
          'cell_divide_target_replica',
          'Strategy-selected replica index for next dispatch · divide 라우트 대상',
          { organ, cell: rec.cell, strategy: rec.strategy },
          rec.targetReplica,
        ),
      );
      lines.push(
        gauge(
          'cell_divide_should_scale',
          '1 when divide condition matches · divide 스케일 조건 충족',
          { organ, cell: rec.cell },
          rec.shouldScale ? 1 : 0,
        ),
      );
    }
  }

  if (snapshot.nervous) {
    const n = snapshot.nervous;
    const base = { organ: n.localOrgan, consumer_group: n.consumerGroup };
    lines.push(
      gauge('cell_nervous_pending', 'Nervous ingress PEL pending count', base, n.pending),
      gauge('cell_nervous_consumed', 'Nervous ingress consumed (process lifetime)', base, n.consumed),
      gauge('cell_nervous_acked', 'Nervous ingress acked (process lifetime)', base, n.acked),
      gauge('cell_nervous_reclaimed', 'Nervous ingress reclaimed via XAUTOCLAIM', base, n.reclaimed),
      gauge('cell_nervous_published', 'Nervous cross-organ published (process lifetime)', base, n.published),
    );
  }

  return `${lines.join('\n')}\n`;
}

export function shouldExposePrometheusMetrics(): boolean {
  const v = process.env.CELL_METRICS?.toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}
