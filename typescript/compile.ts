// ═══════════════════════════════════════════════════════════
//  Cell Coding — Compiler entry point
//  .cell source → tokens → AST → type-check diagnostics
//  .cell 소스 → 토큰 → AST → 타입 검사 진단
// ═══════════════════════════════════════════════════════════

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { TypeChecker, type TypeCheckError } from './checker.js';
import type { Program } from './ast.js';

export interface CompileResult {
  program:     Program;
  diagnostics: TypeCheckError[];
}

export function compile(source: string): CompileResult {
  const tokens = new Lexer(source).tokenize();
  const program = new Parser(tokens).parse();
  const diagnostics = new TypeChecker().check(program);
  return { program, diagnostics };
}

export { Lexer, Parser, TypeChecker };
export { CellRuntime } from './runtime.js';
export type { TypeCheckError, Program };
export type { SignalInstance, TraceEntry, RuntimeOptions } from './runtime.js';
export { extractProgramGraph, buildFlowSteps, buildViewerScenario } from './signal-graph.js';
export type { ProgramGraph, FlowStep, ViewerScenarioBundle, CellGraphNode } from './signal-graph.js';
export { buildOrganIndex, filterHandlersByOrganScope } from './nervous-routing.js';
export type { OrganIndex } from './nervous-routing.js';
export { CircuitBreakerManager } from './circuit-breaker.js';
export type { CircuitPhase } from './circuit-breaker.js';
export { DeadLetterStore } from './dead-letter.js';
export type { DeadLetterEntry } from './dead-letter.js';
export {
  InMemorySignalBus,
  RedisSignalBusAdapter,
  InMemoryRedisLikeClient,
  freezeSignal,
} from './signal-bus.js';
export type { SignalBusAdapter, BusMessage, RedisLikeClient } from './signal-bus.js';
export { buildSignalPriorityMap, priorityForType, priorityRank } from './signal-priority.js';
export type { SignalPriority } from './signal-priority.js';
export type {
  CellLifecyclePhase,
  LifecycleTransition,
  LifecycleSnapshot,
} from './lifecycle.js';
export { runCellFile, runCellFileAsync, formatRunHuman } from './run-cell.js';
export type { RunCellOptions, RunCellResult, TranspiledRunOptions } from './run-cell.js';
export { loadTranspiledRegistrations } from './transpiled-loader.js';
export type { LoadTranspiledOptions } from './transpiled-loader.js';
export { transpileProgram, transpileCellFile, defaultBuildOutPath } from './transpiler.js';
export type { TranspileOptions, TranspileResult, TranspileFileOptions } from './transpiler.js';
export { transpileHandlerBody, transpileExpr } from './transpile-handler.js';
export {
  BaseCell,
  handlerMethodName,
  apoptosisMethodName,
  transpiledImportLine,
  inlineTranspiledPreamble,
} from './transpiled-cell.js';
export type { CellHandlerFn, EmitSignalFn } from './transpiled-cell.js';
export { createTranspiledRuntime, createTranspiledRuntimeFromFile, buildTranspiledBindings } from './transpiled-runtime.js';
export type {
  TranspiledCellRegistration,
  TranspiledCellCtor,
  TranspiledHandlerBinding,
  TranspiledApoptosisHook,
} from './transpiled-runtime.js';
export { inspectProgram, inspectCellFile, formatInspectHuman } from './cell-inspect.js';
export type {
  InspectResult,
  InspectFileOptions,
  CellSummary,
  TissueSummary,
  OrganSummary,
  OrganismSummary,
} from './cell-inspect.js';
export {
  installPackage,
  formatInstallHuman,
  listRegistryPackages,
  resolveRegistryRoot,
  checkMembraneCompatibility,
  normalizePackageRef,
} from './cell-registry.js';
export type {
  InstallResult,
  CellProjectConfig,
  CellPackageManifest,
  RegistryPackageMeta,
} from './cell-registry.js';
export { composeOrgan, formatComposeHuman } from './cell-compose.js';
export type { ComposeResult, ComposeOptions } from './cell-compose.js';
export { deployCellFile, formatDeployHuman } from './cell-deploy.js';
export type { DeployResult, DeployOptions } from './cell-deploy.js';
export {
  extractDividePolicies,
  recommendReplicas,
  organHpaSpec,
  evalDivideCondition,
  DivideBalancer,
  recommendReplicasAsync,
} from './cell-divide.js';
export type { DivideCoordinatorLike } from './cell-divide.js';
export { createDivideCoordinator } from './divide-coordinator.js';
export type { DivideCoordinator } from './divide-coordinator.js';
export { startDivideGateway } from './divide-gateway.js';
export type { DivideGatewayOptions, DivideGatewayHandle } from './divide-gateway.js';
export type { DividePolicy, DivideRecommendation, OrganHpaSpec } from './cell-divide.js';
export { satisfiesRange, compareSemver, parseSemver } from './cell-semver.js';
export { startCloudServe } from './cloud-serve.js';
export type { CloudServeOptions, CloudServeHandle } from './cloud-serve.js';
export { createRedisStreamsClient } from './redis-streams-client.js';
export { NervousFabric, nervousStreamKey, parseNervousEnvelope, defaultNervousConsumerName } from './nervous-fabric.js';
export type { NervousEnvelope, NervousFabricStats, NervousIngress } from './nervous-fabric.js';
export { resetSharedMockRedisClient } from './cloud-serve.js';
export { formatPrometheusMetrics, shouldExposePrometheusMetrics } from './cell-metrics.js';
export type { CellMetricsSnapshot } from './cell-metrics.js';
export {
  traceToOtelPayload,
  shouldExportOtel,
  shouldPushOtelToCollector,
  pushOtelTraces,
  otelCollectorEndpoint,
  jaegerSearchUrl,
} from './otel-export.js';
export type { OtelSpan, OtelTracePayload } from './otel-export.js';
export {
  loadCellFunctions,
  resolveCellFunctions,
  defaultFunctionsPath,
  cellFunctionBuiltins,
} from './cell-functions.js';
export type { CellFunction } from './cell-functions.js';
export {
  runCellTestFile,
  runCellTestCase,
  evaluateExpectations,
  resolveTargetCells,
  defaultTestFilePath,
  formatCellTestHuman,
} from './cell-lab.js';
export type {
  CellTestFile,
  CellTestSuite,
  CellTestCase,
  CellTestExpectation,
  CellTestRunResult,
  CellTestCoverage,
  TargetCoverageReport,
} from './cell-lab.js';
