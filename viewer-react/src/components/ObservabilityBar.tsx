import type { LiveRunObservability } from '../types';

interface Props {
  observability?: LiveRunObservability;
}

/** OTel/Jaeger 관측성 링크 · cell run --jaeger */
export default function ObservabilityBar({ observability }: Props) {
  if (!observability?.jaegerUrl) return null;

  const label = observability.otelService ?? 'trace';

  return (
    <a
      className="obs-link"
      href={observability.jaegerUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Jaeger UI에서 분산 trace 검색 · Open distributed trace in Jaeger"
    >
      Jaeger · {label}
    </a>
  );
}
