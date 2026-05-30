// ═══════════════════════════════════════════════════════════
//  Cell Coding — Viewer inspect snapshot
//  cell inspect 결과 → Viewer 페이로드 (순환 import 방지)
// ═══════════════════════════════════════════════════════════

import type * as AST from './ast.js';
import type { TypeCheckError } from './checker.js';
import { inspectProgram } from './cell-inspect.js';

export interface ViewerHierarchyCell {
  name: string;
  role: string;
  tissue?: string;
  organ?: string;
}

export interface ViewerHierarchyOrgan {
  name: string;
  tissues: string[];
  cells: ViewerHierarchyCell[];
  exports: string[];
}

export interface ViewerNervousRoute {
  source: string;
  targets: string[];
  branchKind?: string;
  hasTransform: boolean;
}

export interface ViewerImmunePolicy {
  block: string;
  errorType: string;
  strategy: string;
  escalate?: boolean;
}

/** Static analysis attached to viewer scenarios · viewer 시나리오에 붙는 정적 분석 */
export interface ViewerInspectSnapshot {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    signalCount: number;
    cellCount: number;
    tissueCount: number;
    organCount: number;
  };
  organism?: {
    name: string;
    organs: string[];
  };
  hierarchy: ViewerHierarchyOrgan[];
  nervousRoutes: ViewerNervousRoute[];
  immunePolicies: ViewerImmunePolicy[];
}

/** Build viewer-friendly inspect snapshot from a compiled program. */
/** 컴파일된 program에서 viewer용 inspect 스냅샷을 만든다. */
export function buildViewerInspectSnapshot(
  program: AST.Program,
  diagnostics: TypeCheckError[] = [],
): ViewerInspectSnapshot {
  const result = inspectProgram(program, { diagnostics });

  const hierarchy: ViewerHierarchyOrgan[] = result.organs.map(organ => ({
    name: organ.name,
    tissues: organ.tissues,
    exports: organ.exports,
    cells: result.cells
      .filter(c => organ.cells.includes(c.name))
      .map(c => ({
        name: c.name,
        role: c.role,
        tissue: c.tissue,
        organ: c.organ,
      })),
  }));

  return {
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    stats: result.stats,
    organism: result.organism
      ? { name: result.organism.name, organs: result.organism.organs }
      : undefined,
    hierarchy,
    nervousRoutes: result.organism?.nervous?.routes ?? [],
    immunePolicies: result.organism?.immune?.policies ?? [],
  };
}
