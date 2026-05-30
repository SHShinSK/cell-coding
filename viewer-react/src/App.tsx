import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LifecyclePanel from './components/LifecyclePanel';
import SignalGraph from './components/SignalGraph';
import Timeline from './components/Timeline';
import OrganismPanel from './components/OrganismPanel';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import ObservabilityBar from './components/ObservabilityBar';
import type { TracesPayload, ViewerScenario } from './types';

const DEFAULT_POLL_MS = 1000;

function traceSource(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('live') || 'traces.json';
}

function isLiveSource(): boolean {
  return new URLSearchParams(window.location.search).has('live');
}

function applyPayload(
  data: TracesPayload,
  setPayload: (p: TracesPayload) => void,
  setScenarioId: (id: string) => void,
  preserveScenarioId?: string,
) {
  setPayload(data);
  const nextId = preserveScenarioId && data.scenarios.some(s => s.id === preserveScenarioId)
    ? preserveScenarioId
    : data.scenarios[0]?.id ?? '';
  setScenarioId(nextId);
}

export default function App() {
  const [payload, setPayload] = useState<TracesPayload | null>(null);
  const [scenarioId, setScenarioId] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [filter, setFilter] = useState('');
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [sourceLabel, setSourceLabel] = useState('traces.json');
  const playTimer = useRef<number | null>(null);
  const lastGeneratedAt = useRef<string | null>(null);
  const scenarioIdRef = useRef('');

  useEffect(() => {
    scenarioIdRef.current = scenarioId;
  }, [scenarioId]);

  useEffect(() => {
    if (window.__CELL_VIEWER_PAYLOAD__) {
      applyPayload(window.__CELL_VIEWER_PAYLOAD__, setPayload, setScenarioId);
      lastGeneratedAt.current = window.__CELL_VIEWER_PAYLOAD__.generatedAt;
      setSourceLabel(window.__CELL_VIEWER_PAYLOAD__.live ? 'VS Code live run' : 'VS Code traces');
      return;
    }

    const onPayload = () => {
      if (!window.__CELL_VIEWER_PAYLOAD__) return;
      applyPayload(
        window.__CELL_VIEWER_PAYLOAD__,
        setPayload,
        setScenarioId,
        scenarioIdRef.current,
      );
      lastGeneratedAt.current = window.__CELL_VIEWER_PAYLOAD__.generatedAt;
      setSourceLabel(window.__CELL_VIEWER_PAYLOAD__.live ? 'VS Code live run' : 'VS Code traces');
    };
    window.addEventListener('cell-viewer-payload', onPayload);

    if (window.__CELL_VIEWER_BOOT__) {
      return () => window.removeEventListener('cell-viewer-payload', onPayload);
    }

    const file = traceSource();
    setSourceLabel(file);
    fetch(file)
      .then(r => {
        if (!r.ok) throw new Error(`${file} not found — run: cd typescript && npm run viewer:traces`);
        return r.json();
      })
      .then((data: TracesPayload) => {
        applyPayload(data, setPayload, setScenarioId);
        lastGeneratedAt.current = data.generatedAt;
      })
      .catch(e => setError(String(e.message ?? e)));

    return () => window.removeEventListener('cell-viewer-payload', onPayload);
  }, []);

  useEffect(() => {
    if (window.__CELL_VIEWER_BOOT__ || !isLiveSource()) return;

    const file = traceSource();
    let pollMs = DEFAULT_POLL_MS;

    const poll = async () => {
      try {
        const res = await fetch(`${file}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data: TracesPayload = await res.json();
        pollMs = data.pollIntervalMs ?? pollMs;
        if (data.generatedAt === lastGeneratedAt.current) return;
        lastGeneratedAt.current = data.generatedAt;
        applyPayload(data, setPayload, setScenarioId, scenarioIdRef.current);
        setSourceLabel(data.watch ? `${file} (watch)` : file);
      } catch {
        /* ignore transient fetch errors · 일시적 fetch 오류 무시 */
      }
    };

    const timer = window.setInterval(poll, pollMs);
    return () => window.clearInterval(timer);
  }, []);

  const scenario: ViewerScenario | undefined = useMemo(
    () => {
      const s = payload?.scenarios.find(sc => sc.id === scenarioId);
      if (!s) return undefined;
      if (s.inspect) return s;
      return {
        ...s,
        inspect: {
          ok: true,
          errors: [],
          warnings: [],
          stats: {
            signalCount: 0,
            cellCount: s.graph.cells.length,
            tissueCount: s.graph.tissueFlow.length,
            organCount: 0,
          },
          hierarchy: [],
          nervousRoutes: [],
          immunePolicies: s.graph.immune.map(p => ({
            block: p.name,
            errorType: p.errorType,
            strategy: p.strategy,
          })),
        },
      };
    },
    [payload, scenarioId],
  );

  const stopPlay = useCallback(() => {
    if (playTimer.current !== null) {
      window.clearInterval(playTimer.current);
      playTimer.current = null;
    }
    setPlaying(false);
  }, []);

  const setStep = useCallback((index: number) => {
    if (!scenario) return;
    setActiveStep(Math.max(0, Math.min(scenario.steps.length - 1, index)));
  }, [scenario]);

  const togglePlay = useCallback(() => {
    if (!scenario) return;
    if (playing) {
      stopPlay();
      return;
    }
    setPlaying(true);
    playTimer.current = window.setInterval(() => {
      setActiveStep(prev => {
        if (!scenario || prev >= scenario.steps.length - 1) {
          stopPlay();
          return prev;
        }
        return prev + 1;
      });
    }, 700);
  }, [playing, scenario, stopPlay]);

  useEffect(() => () => stopPlay(), [stopPlay]);

  useEffect(() => {
    stopPlay();
    setActiveStep(0);
  }, [scenarioId, stopPlay]);

  if (error) {
    return <div className="status">{error}</div>;
  }
  if (!payload || !scenario) {
    return <div className="status">Loading traces… · trace 로딩 중</div>;
  }

  return (
    <div className="app">
      <div className="grid-bg" />
      <header>
        <div className="brand">
          <h1>Cell Viewer React · 신호 흐름</h1>
          <p>
            {payload.live ? (payload.watch ? 'Live watch · 실시간 watch' : 'Live run · 실시간 실행') : 'Batch traces · 일괄 trace'}
            {' · '}
            <code>{sourceLabel}</code>
          </p>
        </div>
        <div className="controls">
          <select
            value={scenarioId}
            onChange={e => setScenarioId(e.target.value)}
            aria-label="Scenario"
          >
            {payload.scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.title} · {s.titleKo}</option>
            ))}
          </select>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter cell / signal · 세포·신호 필터"
          />
          <div className="playback">
            <button type="button" onClick={() => setStep(activeStep - 1)} title="Previous step">◀</button>
            <button type="button" className={playing ? 'active' : ''} onClick={togglePlay} title="Play">
              {playing ? '⏸' : '▶'}
            </button>
            <button type="button" onClick={() => setStep(activeStep + 1)} title="Next step">▶▶</button>
          </div>
          <ObservabilityBar observability={payload.observability} />
        </div>
      </header>

      <main>
        <section className="panel">
          <div className="panel-head">
            <span>Signal graph · 신호 그래프</span>
            <span>{scenario.file.split('/').slice(-2).join('/')}</span>
          </div>
          <SignalGraph scenario={scenario} activeStep={activeStep} />
          <div className="legend">
            <span><i className="dot external" />external · 외부 주입</span>
            <span><i className="dot cell" />cell emit · 세포 방출</span>
            <span><i className="dot immune" />immune · 면역</span>
          </div>
        </section>

        <div className="sidebar">
          <section className="panel">
            <div className="panel-head">
              <span>Timeline · 타임라인</span>
              <span>{scenario.steps.length} steps · {scenario.steps.length}단계</span>
            </div>
            <Timeline
              steps={scenario.steps}
              activeStep={activeStep}
              filter={filter}
              onSelect={setStep}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <span>Lifecycle · 생존 주기</span>
              <span>{Object.keys(scenario.lifecycle.states).length} cells · {Object.keys(scenario.lifecycle.states).length}세포</span>
            </div>
            <LifecyclePanel lifecycle={scenario.lifecycle} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <span>Organism · 계층</span>
              <span>{scenario.inspect.stats.organCount} organs · {scenario.inspect.stats.organCount}기관</span>
            </div>
            <OrganismPanel inspect={scenario.inspect} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <span>Membrane · 막 계약</span>
              <span className={scenario.inspect.ok ? 'pill ok' : 'pill bad'}>
                {scenario.inspect.ok ? 'OK' : `${scenario.inspect.errors.length} err`}
              </span>
            </div>
            <DiagnosticsPanel inspect={scenario.inspect} />
          </section>
        </div>
      </main>
    </div>
  );
}
