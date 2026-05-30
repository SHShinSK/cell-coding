// ═══════════════════════════════════════════════════════════
//  Cell Coding — Cell Lab (isolated test runner)
//  세포·조직 격리 테스트 + 신호 주입 + trace 단언
// ═══════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { compile } from './compile.js';
import { CellRuntime, type SignalInstance, type TraceEntry } from './runtime.js';
import type * as AST from './ast.js';

export interface CellTestExpectation {
  kind: 'trace' | 'none' | 'count';
  signal: string;
  from?: string;
  data?: Record<string, unknown>;
  count?: number;
}

export interface CellTestCase {
  name: string;
  inject: SignalInstance;
  expect: CellTestExpectation[];
  skip?: boolean;
}

export interface CellTestSuite {
  name: string;
  /** Cell, tissue, or organ name · 세포·조직·기관 이름 */
  target: string;
  /** Enable organism immune/circuit during test · immune/circuit 활성화 */
  immune?: boolean;
  cases: CellTestCase[];
}

export interface CellTestFile {
  version: number;
  suites: CellTestSuite[];
}

export interface CellTestCoverage {
  cellsInvoked: string[];
  signalsEmitted: string[];
}

export interface CellTestCaseResult {
  name: string;
  target: string;
  ok: boolean;
  skipped?: boolean;
  errors: string[];
  trace: TraceEntry[];
  coverage: CellTestCoverage;
}

export interface CellTestSuiteResult {
  name: string;
  target: string;
  cases: CellTestCaseResult[];
  coverageReport?: TargetCoverageReport;
}

export interface TargetCoverageReport {
  target: string;
  cellsExpected: string[];
  cellsHit: string[];
  cellsMissed: string[];
  /** 0..1 · 세포 커버리지 비율 */
  hitRatio: number;
}

export interface CellTestRunResult {
  ok: boolean;
  file: string;
  testFile?: string;
  passed: number;
  failed: number;
  skipped: number;
  suites: CellTestSuiteResult[];
  errors: string[];
  coverageSummary?: TargetCoverageReport[];
}

/** Default sidecar path: `<stem>.celltest.json` · 기본 sidecar 경로 */
export function defaultTestFilePath(cellFile: string): string {
  const abs = resolve(cellFile);
  if (abs.endsWith('.cell')) {
    return abs.replace(/\.cell$/i, '.celltest.json');
  }
  return `${abs}.celltest.json`;
}

/** Resolve target name to active cell names. */
/** target 이름을 활성 세포 목록으로 변환한다. */
export function resolveTargetCells(program: AST.Program, target: string): string[] {
  const cells = program.statements.filter(
    (s): s is AST.CellDecl => s.kind === 'CellDecl',
  );
  if (cells.some(c => c.name === target)) return [target];

  const tissue = program.statements.find(
    (s): s is AST.TissueDecl => s.kind === 'TissueDecl' && s.name === target,
  );
  if (tissue?.flow?.steps.length) return [...tissue.flow.steps];

  const organ = program.statements.find(
    (s): s is AST.OrganDecl => s.kind === 'OrganDecl' && s.name === target,
  );
  if (organ) {
    const tissues = new Map<string, AST.TissueDecl>();
    for (const decl of program.statements) {
      if (decl.kind === 'TissueDecl') tissues.set(decl.name, decl);
    }
    const names: string[] = [];
    for (const tissueName of organ.tissues) {
      const t = tissues.get(tissueName);
      if (t?.flow) names.push(...t.flow.steps);
    }
    if (names.length) return names;
  }

  const organism = program.statements.find(
    (s): s is AST.OrganismDecl => s.kind === 'OrganismDecl' && s.name === target,
  );
  if (organism) {
    const organs = new Map<string, AST.OrganDecl>();
    const tissues = new Map<string, AST.TissueDecl>();
    for (const decl of program.statements) {
      if (decl.kind === 'OrganDecl') organs.set(decl.name, decl);
      if (decl.kind === 'TissueDecl') tissues.set(decl.name, decl);
    }
    const names: string[] = [];
    for (const organName of organism.organs) {
      const o = organs.get(organName);
      if (!o) continue;
      for (const tissueName of o.tissues) {
        const t = tissues.get(tissueName);
        if (t?.flow) names.push(...t.flow.steps);
      }
    }
    if (names.length) return names;
  }

  throw new Error(`Unknown test target '${target}' · 알 수 없는 테스트 대상`);
}

function fromMatches(entryFrom: string, expected?: string): boolean {
  if (!expected) return true;
  if (expected.endsWith(':')) return entryFrom.startsWith(expected);
  return entryFrom === expected;
}

function partialDataMatch(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
): boolean {
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function traceMatches(
  trace: TraceEntry[],
  exp: CellTestExpectation,
): TraceEntry | undefined {
  return trace.find(entry => {
    if (!exp.from?.startsWith('immune:') && entry.from.startsWith('immune:')) return false;
    if (exp.from && !fromMatches(entry.from, exp.from)) return false;
    if (entry.signal.type !== exp.signal) return false;
    if (exp.data && !partialDataMatch(entry.signal.data, exp.data)) return false;
    return true;
  });
}

/** Evaluate expectations against a runtime trace. */
/** trace에 대한 기대값을 검증한다. */
export function evaluateExpectations(
  trace: TraceEntry[],
  expectations: CellTestExpectation[],
): string[] {
  const errors: string[] = [];

  for (const exp of expectations) {
    switch (exp.kind) {
      case 'trace': {
        if (!traceMatches(trace, exp)) {
          const detail = exp.data ? ` ${JSON.stringify(exp.data)}` : '';
          const from = exp.from ? `${exp.from} → ` : '';
          errors.push(`expected trace: ${from}${exp.signal}${detail}`);
        }
        break;
      }
      case 'none': {
        const hit = traceMatches(trace, exp);
        if (hit) {
          errors.push(`expected no ${exp.signal}${exp.from ? ` from ${exp.from}` : ''}`);
        }
        break;
      }
      case 'count': {
        const count = trace.filter(entry => {
          if (!exp.from?.startsWith('immune:') && entry.from.startsWith('immune:')) return false;
          if (exp.from && !fromMatches(entry.from, exp.from)) return false;
          return entry.signal.type === exp.signal;
        }).length;
        const want = exp.count ?? 1;
        if (count !== want) {
          errors.push(`expected ${want}× ${exp.signal}, got ${count}`);
        }
        break;
      }
      default:
        errors.push(`unknown expectation kind · 알 수 없는 expect 종류`);
    }
  }

  return errors;
}

function computeCoverage(trace: TraceEntry[]): CellTestCoverage {
  const cellsInvoked = new Set<string>();
  const signalsEmitted = new Set<string>();

  for (const entry of trace) {
    if (entry.from === 'external' || entry.from.startsWith('immune:')) continue;
    cellsInvoked.add(entry.from);
    signalsEmitted.add(entry.signal.type);
  }

  return {
    cellsInvoked: [...cellsInvoked].sort(),
    signalsEmitted: [...signalsEmitted].sort(),
  };
}

export interface RunCellTestCaseOptions {
  program: AST.Program;
  target: string;
  testCase: CellTestCase;
  disableImmune?: boolean;
}

/** Run one isolated/in-scope test case. */
/** 격리·스코프 테스트 케이스 1건을 실행한다. */
export function runCellTestCase(opts: RunCellTestCaseOptions): CellTestCaseResult {
  const { program, target, testCase } = opts;

  if (testCase.skip) {
    return {
      name: testCase.name,
      target,
      ok: true,
      skipped: true,
      errors: [],
      trace: [],
      coverage: { cellsInvoked: [], signalsEmitted: [] },
    };
  }

  let activeCells: string[];
  try {
    activeCells = resolveTargetCells(program, target);
  } catch (e) {
    return {
      name: testCase.name,
      target,
      ok: false,
      errors: [e instanceof Error ? e.message : String(e)],
      trace: [],
      coverage: { cellsInvoked: [], signalsEmitted: [] },
    };
  }

  const runtime = new CellRuntime(program, {
    activeCells,
    disableImmune: opts.disableImmune ?? true,
  });

  const trace = runtime.send(testCase.inject.type, testCase.inject.data ?? {});
  const errors = evaluateExpectations(trace, testCase.expect);

  return {
    name: testCase.name,
    target,
    ok: errors.length === 0,
    errors,
    trace,
    coverage: computeCoverage(trace),
  };
}

export interface RunCellTestFileOptions {
  file: string;
  testFile?: string;
  /** Run only suites matching this target · 특정 target suite만 실행 */
  filterTarget?: string;
  /** Include per-suite coverage report · suite 커버리지 리포트 포함 */
  coverage?: boolean;
}

function buildTargetCoverageReport(
  program: AST.Program,
  target: string,
  cases: CellTestCaseResult[],
): TargetCoverageReport {
  const cellsExpected = resolveTargetCells(program, target);
  const hit = new Set<string>();
  for (const c of cases) {
    if (c.skipped) continue;
    for (const cell of c.coverage.cellsInvoked) hit.add(cell);
  }
  const cellsHit = cellsExpected.filter(c => hit.has(c));
  const cellsMissed = cellsExpected.filter(c => !hit.has(c));
  const hitRatio = cellsExpected.length
    ? cellsHit.length / cellsExpected.length
    : 1;

  return { target, cellsExpected, cellsHit, cellsMissed, hitRatio };
}

function loadTestFile(path: string): CellTestFile {
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as CellTestFile;
  if (!parsed.version || !Array.isArray(parsed.suites)) {
    throw new Error(`Invalid celltest file · celltest JSON 형식 오류: ${path}`);
  }
  return parsed;
}

/** Run all suites from a `.cell` program + sidecar `.celltest.json`. */
/** `.cell` + sidecar `.celltest.json`의 suite를 실행한다. */
export function runCellTestFile(opts: RunCellTestFileOptions): CellTestRunResult {
  const file = resolve(opts.file);
  let source: string;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (e) {
    return {
      ok: false,
      file,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }

  let program: AST.Program;
  let compileErrors: string[];
  try {
    const result = compile(source);
    program = result.program;
    compileErrors = result.diagnostics.filter(d => d.kind === 'error').map(d => d.message);
  } catch (e) {
    return {
      ok: false,
      file,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }

  if (compileErrors.length > 0) {
    return {
      ok: false,
      file,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      errors: compileErrors,
    };
  }

  const testPath = resolve(opts.testFile ?? defaultTestFilePath(file));
  if (!existsSync(testPath)) {
    return {
      ok: false,
      file,
      testFile: testPath,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      errors: [`Test file not found · 테스트 파일 없음: ${testPath}`],
    };
  }

  let testDoc: CellTestFile;
  try {
    testDoc = loadTestFile(testPath);
  } catch (e) {
    return {
      ok: false,
      file,
      testFile: testPath,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }

  const suites = opts.filterTarget
    ? testDoc.suites.filter(s => s.target === opts.filterTarget)
    : testDoc.suites;

  if (opts.filterTarget && suites.length === 0) {
    return {
      ok: false,
      file,
      testFile: testPath,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
      errors: [`No suite for target '${opts.filterTarget}' · 해당 target suite 없음`],
    };
  }

  const suiteResults: CellTestSuiteResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const suite of suites) {
    const cases: CellTestCaseResult[] = [];
    for (const testCase of suite.cases) {
      const result = runCellTestCase({
        program,
        target: suite.target,
        testCase,
        disableImmune: !suite.immune,
      });
      cases.push(result);
      if (result.skipped) skipped++;
      else if (result.ok) passed++;
      else failed++;
    }
    const suiteResult: CellTestSuiteResult = { name: suite.name, target: suite.target, cases };
    if (opts.coverage) {
      suiteResult.coverageReport = buildTargetCoverageReport(program, suite.target, cases);
    }
    suiteResults.push(suiteResult);
  }

  return {
    ok: failed === 0,
    file,
    testFile: testPath,
    passed,
    failed,
    skipped,
    suites: suiteResults,
    errors: [],
    coverageSummary: opts.coverage
      ? suiteResults.map(s => s.coverageReport).filter(Boolean) as TargetCoverageReport[]
      : undefined,
  };
}

/** Human-readable Cell Lab summary for terminal output. */
/** 터미널용 Cell Lab 요약 */
export function formatCellTestHuman(result: CellTestRunResult): string {
  const shortFile = result.file.replace(/\\/g, '/').split('/').slice(-2).join('/');
  const lines: string[] = [
    '',
    '  Cell Lab · 세포 격리 테스트',
    `  file : ${shortFile}`,
  ];

  if (result.testFile) {
    lines.push(`  tests: ${basename(result.testFile)}`);
  }

  if (result.errors.length > 0) {
    lines.push('', '  Errors · 오류:');
    for (const e of result.errors) lines.push(`    ✗ ${e}`);
    lines.push('');
    return lines.join('\n');
  }

  for (const suite of result.suites) {
    lines.push('', `  [${suite.target}] ${suite.name}`);
    for (const c of suite.cases) {
      if (c.skipped) {
        lines.push(`    ○ ${c.name} (skipped · 생략)`);
        continue;
      }
      const icon = c.ok ? '✓' : '✗';
      lines.push(`    ${icon} ${c.name}`);
      for (const err of c.errors) lines.push(`        ${err}`);
      if (c.ok && c.coverage.cellsInvoked.length) {
        lines.push(`        coverage: ${c.coverage.cellsInvoked.join(', ')}`);
      }
    }
    if (suite.coverageReport) {
      const r = suite.coverageReport;
      const pct = Math.round(r.hitRatio * 100);
      lines.push(`    coverage ${r.target}: ${pct}% (${r.cellsHit.length}/${r.cellsExpected.length})`);
      if (r.cellsMissed.length) {
        lines.push(`      missed: ${r.cellsMissed.join(', ')}`);
      }
    }
  }

  if (result.coverageSummary?.length) {
    lines.push('', '  Coverage summary · 커버리지 요약:');
    for (const r of result.coverageSummary) {
      const pct = Math.round(r.hitRatio * 100);
      lines.push(`    ${r.target}: ${pct}% · missed ${r.cellsMissed.length ? r.cellsMissed.join(', ') : '(none)'}`);
    }
  }

  lines.push(
    '',
    `  ${result.passed} passed · ${result.failed} failed · ${result.skipped} skipped`,
    `  ${result.passed} 통과 · ${result.failed} 실패 · ${result.skipped} 생략`,
    '',
  );

  return lines.join('\n');
}
