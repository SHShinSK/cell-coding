// ═══════════════════════════════════════════════════════════
//  Cell Coding — Inspect (Phase 3)
//  세포·조직·기관·organism 정적 분석 + 막 계약 진단
// ═══════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compile } from './compile.js';
import { extractProgramGraph } from './signal-graph.js';
import { buildOrganIndex } from './nervous-routing.js';
import { resolveTargetCells } from './cell-lab.js';
import type * as AST from './ast.js';

export interface SignalSummary {
  name: string;
  priority?: string;
  fieldCount: number;
  extends?: string;
}

export interface CellSummary {
  name: string;
  role: string;
  accepts: string[];
  emits: string[];
  handlers: string[];
  tissue?: string;
  organ?: string;
}

export interface TissueSummary {
  name: string;
  flowKind?: string;
  cells: string[];
}

export interface OrganSummary {
  name: string;
  tissues: string[];
  exports: string[];
  cells: string[];
}

export interface NervousRouteSummary {
  source: string;
  targets: string[];
  branchKind?: string;
  hasTransform: boolean;
}

export interface ImmunePolicySummary {
  block: string;
  errorType: string;
  strategy: string;
  escalate?: boolean;
}

export interface OrganismSummary {
  name: string;
  organs: string[];
  nervous?: {
    name: string;
    routes: NervousRouteSummary[];
  };
  immune?: {
    name: string;
    policies: ImmunePolicySummary[];
    circuit?: {
      threshold: number;
      windowSecs: number;
      openSecs: number;
    };
  };
}

export interface InspectResult {
  ok: boolean;
  file: string;
  target?: string;
  errors: string[];
  warnings: string[];
  signals: SignalSummary[];
  cells: CellSummary[];
  tissues: TissueSummary[];
  organs: OrganSummary[];
  organism?: OrganismSummary;
  stats: {
    signalCount: number;
    cellCount: number;
    tissueCount: number;
    organCount: number;
  };
}

function typeNames(type?: AST.TypeExpr): string[] {
  if (!type) return [];
  switch (type.kind) {
    case 'SimpleType': return [type.name];
    case 'UnionType': return type.types.flatMap(t => typeNames(t));
    case 'GenericType': return [type.name, ...type.params.flatMap(p => typeNames(p))];
    case 'ListType': return typeNames(type.item);
    case 'MapType': return [...typeNames(type.key), ...typeNames(type.value)];
    case 'OptionType': return typeNames(type.inner);
    case 'ResultType': return [...typeNames(type.ok), ...typeNames(type.err)];
    default: return [];
  }
}

function buildHierarchyMaps(program: AST.Program): {
  cellTissue: Map<string, string>;
  cellOrgan: Map<string, string>;
  tissueCells: Map<string, string[]>;
  organCells: Map<string, string[]>;
} {
  const tissues = new Map<string, AST.TissueDecl>();
  const organs = new Map<string, AST.OrganDecl>();
  for (const decl of program.statements) {
    if (decl.kind === 'TissueDecl') tissues.set(decl.name, decl);
    if (decl.kind === 'OrganDecl') organs.set(decl.name, decl);
  }

  const cellTissue = new Map<string, string>();
  const tissueCells = new Map<string, string[]>();
  for (const [name, tissue] of tissues) {
    const steps = tissue.flow?.steps ?? [];
    tissueCells.set(name, [...steps]);
    for (const cell of steps) cellTissue.set(cell, name);
  }

  const cellOrgan = new Map<string, string>();
  const organCells = new Map<string, string[]>();
  for (const [name, organ] of organs) {
    const cells: string[] = [];
    for (const tissueName of organ.tissues) {
      cells.push(...(tissueCells.get(tissueName) ?? []));
    }
    organCells.set(name, cells);
    for (const cell of cells) cellOrgan.set(cell, name);
  }

  return { cellTissue, cellOrgan, tissueCells, organCells };
}

/** Analyze a compiled program (optionally scoped to target). */
/** 컴파일된 program을 분석한다 (target으로 범위 제한 가능). */
export function inspectProgram(
  program: AST.Program,
  opts: { file?: string; target?: string; diagnostics?: { message: string; kind: string }[] } = {},
): InspectResult {
  const errors = (opts.diagnostics ?? []).filter(d => d.kind === 'error').map(d => d.message);
  const warnings = (opts.diagnostics ?? []).filter(d => d.kind === 'warning').map(d => d.message);
  const { cellTissue, cellOrgan, tissueCells, organCells } = buildHierarchyMaps(program);
  const organIndex = buildOrganIndex(program);

  let scopedCells: Set<string> | null = null;
  if (opts.target) {
    try {
      scopedCells = new Set(resolveTargetCells(program, opts.target));
    } catch (e) {
      return {
        ok: false,
        file: opts.file ?? '',
        target: opts.target,
        errors: [e instanceof Error ? e.message : String(e)],
        warnings,
        signals: [],
        cells: [],
        tissues: [],
        organs: [],
        stats: { signalCount: 0, cellCount: 0, tissueCount: 0, organCount: 0 },
      };
    }
  }

  const signals: SignalSummary[] = program.statements
    .filter((s): s is AST.SignalDecl => s.kind === 'SignalDecl')
    .map(s => ({
      name: s.name,
      priority: s.priority,
      fieldCount: s.fields.length,
      extends: s.extends,
    }));

  const graph = extractProgramGraph(program);
  const cells: CellSummary[] = graph.cells
    .filter(c => !scopedCells || scopedCells.has(c.name))
    .map(c => ({
      name: c.name,
      role: c.role,
      accepts: c.accepts,
      emits: c.emits,
      handlers: c.handlers,
      tissue: cellTissue.get(c.name),
      organ: cellOrgan.get(c.name),
    }));

  const tissues: TissueSummary[] = program.statements
    .filter((s): s is AST.TissueDecl => s.kind === 'TissueDecl')
    .filter(t => !opts.target || t.name === opts.target || (scopedCells && t.flow?.steps.some(c => scopedCells!.has(c))))
    .map(t => ({
      name: t.name,
      flowKind: t.flow?.kind,
      cells: [...(t.flow?.steps ?? [])],
    }));

  const organs: OrganSummary[] = program.statements
    .filter((s): s is AST.OrganDecl => s.kind === 'OrganDecl')
    .filter(o => !opts.target || o.name === opts.target || organCells.get(o.name)?.some(c => scopedCells?.has(c)))
    .map(o => ({
      name: o.name,
      tissues: [...o.tissues],
      exports: [...(o.exports ?? [])],
      cells: [...(organCells.get(o.name) ?? [])],
    }));

  let organism: OrganismSummary | undefined;
  const orgDecl = program.statements.find(
    (s): s is AST.OrganismDecl => s.kind === 'OrganismDecl',
  );
  if (orgDecl && (!opts.target || opts.target === orgDecl.name || scopedCells)) {
    organism = {
      name: orgDecl.name,
      organs: [...orgDecl.organs],
    };
    if (orgDecl.nervous) {
      organism.nervous = {
        name: orgDecl.nervous.name,
        routes: orgDecl.nervous.routes.map(r => ({
          source: r.source,
          targets: [...r.targets],
          branchKind: r.branchKind,
          hasTransform: Boolean(r.transform),
        })),
      };
    }
    if (orgDecl.immune) {
      organism.immune = {
        name: orgDecl.immune.name,
        policies: orgDecl.immune.policies.map(p => ({
          block: orgDecl.immune!.name,
          errorType: p.errorType,
          strategy: p.strategy,
          escalate: p.escalate,
        })),
        circuit: orgDecl.immune.circuit
          ? {
              threshold: orgDecl.immune.circuit.threshold,
              windowSecs: orgDecl.immune.circuit.windowSecs,
              openSecs: orgDecl.immune.circuit.openSecs,
            }
          : undefined,
      };
    }
  }

  void organIndex;

  return {
    ok: errors.length === 0,
    file: opts.file ?? '',
    target: opts.target,
    errors,
    warnings,
    signals,
    cells,
    tissues,
    organs,
    organism,
    stats: {
      signalCount: signals.length,
      cellCount: cells.length,
      tissueCount: tissues.length,
      organCount: organs.length,
    },
  };
}

export interface InspectFileOptions {
  file: string;
  target?: string;
}

/** Compile and inspect a `.cell` file. */
/** `.cell` 파일을 컴파일하고 분석한다. */
export function inspectCellFile(opts: InspectFileOptions): InspectResult {
  const file = resolve(opts.file);
  let source: string;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (e) {
    return {
      ok: false,
      file,
      target: opts.target,
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
      signals: [],
      cells: [],
      tissues: [],
      organs: [],
      stats: { signalCount: 0, cellCount: 0, tissueCount: 0, organCount: 0 },
    };
  }

  let program: AST.Program;
  let diagnostics;
  try {
    ({ program, diagnostics } = compile(source));
  } catch (e) {
    return {
      ok: false,
      file,
      target: opts.target,
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
      signals: [],
      cells: [],
      tissues: [],
      organs: [],
      stats: { signalCount: 0, cellCount: 0, tissueCount: 0, organCount: 0 },
    };
  }

  return inspectProgram(program, {
    file,
    target: opts.target,
    diagnostics,
  });
}

/** Human-readable inspect report for terminal output. */
/** 터미널용 inspect 리포트 */
export function formatInspectHuman(result: InspectResult): string {
  const rel = result.file.replace(/\\/g, '/').split('/').slice(-2).join('/');
  const lines: string[] = [
    '',
    '  Cell Coding inspect · 세포 분석',
    `  file   : ${rel}`,
  ];
  if (result.target) lines.push(`  target : ${result.target}`);
  lines.push(
    `  stats  : ${result.stats.signalCount} signals · ${result.stats.cellCount} cells · ${result.stats.tissueCount} tissues · ${result.stats.organCount} organs`,
    '',
  );

  if (result.errors.length) {
    lines.push('  Errors · 오류:');
    for (const e of result.errors) lines.push(`    ✗ ${e}`);
    lines.push('');
  }
  if (result.warnings.length) {
    lines.push('  Warnings · 경고:');
    for (const w of result.warnings) lines.push(`    ⚠ ${w}`);
    lines.push('');
  }

  if (result.cells.length) {
    lines.push('  Cells · 세포:');
    for (const cell of result.cells) {
      lines.push(`    ${cell.name}`);
      lines.push(`      role     : ${cell.role}`);
      lines.push(`      accepts  : ${cell.accepts.join(' | ') || '—'}`);
      lines.push(`      emits    : ${cell.emits.join(' | ') || '—'}`);
      lines.push(`      handlers : ${cell.handlers.join(', ')}`);
      if (cell.tissue || cell.organ) {
        lines.push(`      scope    : ${cell.organ ?? '?'}.${cell.tissue ?? '?'}`);
      }
    }
    lines.push('');
  }

  if (result.tissues.length) {
    lines.push('  Tissues · 조직:');
    for (const tissue of result.tissues) {
      lines.push(`    ${tissue.name} (${tissue.flowKind ?? 'flow'}) → ${tissue.cells.join(' → ')}`);
    }
    lines.push('');
  }

  if (result.organs.length) {
    lines.push('  Organs · 기관:');
    for (const organ of result.organs) {
      lines.push(`    ${organ.name} [${organ.tissues.join(', ')}] cells: ${organ.cells.join(', ')}`);
    }
    lines.push('');
  }

  if (result.organism) {
    lines.push(`  Organism · ${result.organism.name}`);
    lines.push(`    organs: ${result.organism.organs.join(', ')}`);
    if (result.organism.nervous) {
      lines.push(`    nervous ${result.organism.nervous.name}:`);
      for (const route of result.organism.nervous.routes) {
        const kind = route.branchKind && route.branchKind !== 'plain' ? ` [${route.branchKind}]` : '';
        const tx = route.hasTransform ? ' (transform)' : '';
        lines.push(`      ${route.source} → ${route.targets.join(', ')}${kind}${tx}`);
      }
    }
    if (result.organism.immune) {
      lines.push(`    immune ${result.organism.immune.name}:`);
      for (const policy of result.organism.immune.policies) {
        const esc = policy.escalate ? ' escalate' : '';
        lines.push(`      on ${policy.errorType} → ${policy.strategy}${esc}`);
      }
    }
    lines.push('');
  }

  lines.push(result.ok ? '  ✓ inspect OK' : '  ✗ inspect failed');
  return lines.join('\n');
}
