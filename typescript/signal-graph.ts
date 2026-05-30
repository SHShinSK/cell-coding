// ═══════════════════════════════════════════════════════════
//  Cell Coding — Signal graph metadata (Viewer)
//  Program AST + runtime trace → graph nodes and flow steps.
//  Program AST + 런타임 trace → 그래프 노드·흐름 단계.
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';
import type { SignalInstance, TraceEntry } from './runtime.js';
import type { LifecycleSnapshot } from './lifecycle.js';
import type { ViewerInspectSnapshot } from './viewer-inspect.js';
import { buildViewerInspectSnapshot } from './viewer-inspect.js';
import type { TypeCheckError } from './checker.js';

export type { ViewerInspectSnapshot };

export type FlowActorKind = 'external' | 'cell' | 'immune';

export interface CellGraphNode {
  name: string;
  role: string;
  accepts: string[];
  emits: string[];
  handlers: string[];
}

export interface ImmuneGraphNode {
  name: string;
  errorType: string;
  strategy: string;
}

export interface ProgramGraph {
  cells: CellGraphNode[];
  tissueFlow: string[][];
  immune: ImmuneGraphNode[];
}

export interface FlowStep {
  index: number;
  from: string;
  fromKind: FlowActorKind;
  signal: SignalInstance;
  /** Cells whose `on` handler matches this signal · 이 신호를 받는 세포 */
  consumers: string[];
  /** Virtual elapsed ms at emit · 방출 시점 가상 경과(ms) */
  atMs?: number;
  /** Backoff wait before a scheduled retry · retry 예약 전 대기(ms) */
  backoffMs?: number;
}

export interface ViewerScenarioBundle {
  id: string;
  title: string;
  titleKo: string;
  file: string;
  input: SignalInstance;
  graph: ProgramGraph;
  trace: TraceEntry[];
  steps: FlowStep[];
  lifecycle: LifecycleSnapshot;
  /** Static inspect / membrane diagnostics · 정적 inspect·막 진단 */
  inspect: ViewerInspectSnapshot;
}

function typeNames(type?: AST.TypeExpr): string[] {
  if (!type) return [];
  switch (type.kind) {
    case 'SimpleType':  return [type.name];
    case 'UnionType':   return type.types.flatMap(t => typeNames(t));
    case 'GenericType': return [type.name, ...type.params.flatMap(p => typeNames(p))];
    case 'ListType':    return typeNames(type.item);
    case 'MapType':     return [...typeNames(type.key), ...typeNames(type.value)];
    case 'OptionType':  return typeNames(type.inner);
    case 'ResultType':  return [...typeNames(type.ok), ...typeNames(type.err)];
    default:            return [];
  }
}

function actorKind(from: string): FlowActorKind {
  if (from === 'external') return 'external';
  if (from.startsWith('immune:')) return 'immune';
  return 'cell';
}

/** Extract static cell/tissue/immune graph from a compiled program. */
/** 컴파일된 program에서 세포·조직·immune 정적 그래프를 추출한다. */
export function extractProgramGraph(program: AST.Program): ProgramGraph {
  const cells: CellGraphNode[] = [];
  const tissueFlow: string[][] = [];
  const immune: ImmuneGraphNode[] = [];

  for (const decl of program.statements) {
    if (decl.kind === 'CellDecl') {
      cells.push({
        name: decl.name,
        role: decl.body.role,
        accepts: typeNames(decl.body.membrane.accepts),
        emits: typeNames(decl.body.membrane.emits),
        handlers: decl.body.handlers.map(h => h.signalType),
      });
    }
    if (decl.kind === 'TissueDecl' && decl.flow?.steps.length) {
      tissueFlow.push([...decl.flow.steps]);
    }
    if (decl.kind === 'OrganismDecl' && decl.immune) {
      for (const policy of decl.immune.policies) {
        immune.push({
          name: decl.immune.name,
          errorType: policy.errorType,
          strategy: policy.strategy,
        });
      }
    }
  }

  return { cells, tissueFlow, immune };
}

/** Map trace entries to flow steps with signal consumers. */
/** trace 항목을 소비 세포 정보가 포함된 flow step으로 변환한다. */
export function buildFlowSteps(trace: TraceEntry[], graph: ProgramGraph): FlowStep[] {
  const handlerMap = new Map<string, string[]>();
  for (const cell of graph.cells) {
    for (const signalType of cell.handlers) {
      const list = handlerMap.get(signalType) ?? [];
      list.push(cell.name);
      handlerMap.set(signalType, list);
    }
  }

  return trace.map((entry, index) => ({
    index,
    from: entry.from,
    fromKind: actorKind(entry.from),
    signal: entry.signal,
    consumers: [...(handlerMap.get(entry.signal.type) ?? [])],
    atMs: entry.atMs,
    backoffMs: entry.backoffMs,
  }));
}

export function buildViewerScenario(
  id: string,
  title: string,
  titleKo: string,
  file: string,
  program: AST.Program,
  trace: TraceEntry[],
  input: SignalInstance,
  lifecycle: LifecycleSnapshot,
  diagnostics: TypeCheckError[] = [],
): ViewerScenarioBundle {
  const graph = extractProgramGraph(program);
  return {
    id,
    title,
    titleKo,
    file,
    input,
    graph,
    trace,
    steps: buildFlowSteps(trace, graph),
    lifecycle,
    inspect: buildViewerInspectSnapshot(program, diagnostics),
  };
}
