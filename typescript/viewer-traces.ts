// ═══════════════════════════════════════════════════════════
//  Cell Coding — Viewer trace generator
//  Runs reference scenarios and writes viewer/traces.json.
//  레퍼런스 시나리오를 실행해 viewer/traces.json을 생성한다.
// ═══════════════════════════════════════════════════════════

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runCellFile } from './run-cell.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

interface ScenarioDef {
  id: string;
  title: string;
  titleKo: string;
  file: string;
  input: { type: string; data: Record<string, unknown> };
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'porifera-clean',
    title: 'Porifera — clean filter path',
    titleKo: 'Porifera — 정상 여과 경로',
    file: 'examples/porifera-filter/sponge-organism.cell',
    input: { type: 'WaterSample', data: { turbidity: 0.2, flowRate: 10 } },
  },
  {
    id: 'porifera-fault',
    title: 'Porifera — sensor fault + immune retry',
    titleKo: 'Porifera — 센서 fault + immune retry',
    file: 'examples/porifera-filter/sponge-organism.cell',
    input: { type: 'WaterSample', data: { turbidity: 0.95, flowRate: 10 } },
  },
  {
    id: 'pet-comfort',
    title: 'PET — distress + immune fallback',
    titleKo: 'PET — distress + immune fallback',
    file: 'examples/pet-robot/pet-organism.cell',
    input: { type: 'OwnerPing', data: { rssi: 0.01 } },
  },
  {
    id: 'pet-presence',
    title: 'PET — owner presence (no immune)',
    titleKo: 'PET — 주인 감지 (immune 없음)',
    file: 'examples/pet-robot/pet-organism.cell',
    input: { type: 'OwnerPing', data: { rssi: 0.8 } },
  },
  {
    id: 'spider-stance',
    title: 'Spider — vision to stance hold',
    titleKo: 'Spider — 시각 → 자세 유지',
    file: 'examples/spider-robot/spider-organism.cell',
    input: { type: 'VisionFrame', data: { contrast: 0.6, motion: 0.3 } },
  },
];

function runScenario(def: ScenarioDef) {
  const result = runCellFile({
    file: join(root, def.file),
    input: { type: def.input.type, data: def.input.data },
    id: def.id,
    title: def.title,
    titleKo: def.titleKo,
  });
  if (!result.ok || !result.bundle) {
    throw new Error(`${def.id}: run failed — ${result.errors[0] ?? 'unknown'}`);
  }
  return result.bundle;
}

export function generateViewerTraces() {
  const scenarios = SCENARIOS.map(runScenario);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    scenarios,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outDir = join(root, 'viewer');
  mkdirSync(outDir, { recursive: true });
  const payload = generateViewerTraces();
  const outPath = join(outDir, 'traces.json');
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Wrote ${payload.scenarios.length} scenario(s) → ${outPath.replace(/\\/g, '/')}`);
}
