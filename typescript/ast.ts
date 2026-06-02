// ═══════════════════════════════════════════════════════════
//  Cell Coding — AST Node Definitions
//  All AST node types produced by the parser.
//  파서가 생성하는 추상 구문 트리의 모든 노드 타입.
// ═══════════════════════════════════════════════════════════

// ── Position · 위치 정보 ───────────────────────────────────
export interface Position {
  line: number;
  col:  number;
}

// ── Base node · 기반 노드 ──────────────────────────────────
export interface BaseNode {
  kind: string;
  pos:  Position;
}

// ── Program · 최상위 프로그램 ──────────────────────────────
export interface Program extends BaseNode {
  kind:       'Program';
  statements: TopLevelDecl[];
}

export type TopLevelDecl =
  | SignalDecl
  | StreamDecl
  | CellDecl
  | TissueDecl
  | OrganDecl
  | OrganismDecl
  | GenomeDecl;

// ══════════════════════════════════════════════════════════
//  Signal · 신호
// ══════════════════════════════════════════════════════════

export interface SignalDecl extends BaseNode {
  kind:     'SignalDecl';
  name:     string;
  extends?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  fields:   FieldDecl[];
}

export interface StreamDecl extends BaseNode {
  kind:         'StreamDecl';
  name:         string;
  rateHz?:      number;
  sampleType:   string;
  sampleFields?: FieldDecl[];
}

export interface FieldDecl extends BaseNode {
  kind:      'FieldDecl';
  name:      string;
  typeExpr:  TypeExpr;
  optional?: boolean;
  default?:  Expr;
}

// ── Type expressions · 타입 표현식 ────────────────────────
export type TypeExpr =
  | SimpleType
  | UnionType
  | GenericType
  | ListType
  | MapType
  | OptionType
  | ResultType;

export interface SimpleType  extends BaseNode { kind: 'SimpleType';  name: string; }
export interface UnionType   extends BaseNode { kind: 'UnionType';   types: TypeExpr[]; }
export interface GenericType extends BaseNode { kind: 'GenericType'; name: string; params: TypeExpr[]; }
export interface ListType    extends BaseNode { kind: 'ListType';    item: TypeExpr; }
export interface MapType     extends BaseNode { kind: 'MapType';     key: TypeExpr; value: TypeExpr; }
export interface OptionType  extends BaseNode { kind: 'OptionType';  inner: TypeExpr; }
export interface ResultType  extends BaseNode { kind: 'ResultType';  ok: TypeExpr; err: TypeExpr; }

// ══════════════════════════════════════════════════════════
//  Cell · 세포
// ══════════════════════════════════════════════════════════

export interface CellDecl extends BaseNode {
  kind:      'CellDecl';
  name:      string;
  fromGenome?: string;
  withGenomes: string[];
  body:      CellBody;
}

export interface CellBody {
  role:       string;               // required · 필수
  tags?:      string[];
  lifespan?:  'stateless' | 'persistent' | 'session';
  membrane:   MembraneDecl;         // required · 필수
  nucleus?:   NucleusDecl;
  handlers:   HandlerDecl[];        // at least one · 최소 1개
  apoptosis?: ApoptosisDecl;
  divide?:    DivideDecl;
  mutate?:    MutateDecl;
}

// ── Membrane · 막 ──────────────────────────────────────────
export interface MembraneDecl extends BaseNode {
  kind:           'MembraneDecl';
  accepts?:       TypeExpr;
  acceptsIsQuery?: boolean;
  emits?:         TypeExpr;
  rejects?:       TypeExpr;
  observes?:      TypeExpr;
  passthrough?:   TypeExpr;
  physicalSla?:   MembranePhysicalSla;
}

export interface MembranePhysicalSla {
  latencyBudgetMs?:   number;
  rateMaxHz?:         number;
  stalenessRejectMs?: number;
  onViolation?:       'holdLastSafe' | 'drop' | 'emitFault';
}

// ── Nucleus · 핵 ───────────────────────────────────────────
export interface NucleusDecl extends BaseNode {
  kind:   'NucleusDecl';
  fields: FieldDecl[];
}

// ── Handler (on block) · 핸들러 (on 블록) ──────────────────
export interface HandlerDecl extends BaseNode {
  kind:      'HandlerDecl';
  signalType: string;
  paramName:  string;
  isQuery?:   boolean;
  isSample?:  boolean;
  body:       Stmt[];
}

// ── Apoptosis · 세포사멸 ───────────────────────────────────
export interface ApoptosisDecl extends BaseNode {
  kind: 'ApoptosisDecl';
  body: Stmt[];
}

// ── Divide · 분열 ──────────────────────────────────────────
export interface DivideDecl extends BaseNode {
  kind:      'DivideDecl';
  condition: Expr;
  max:       number;
  strategy:  'round-robin' | 'least-loaded' | 'random';
}

// ── Mutate · 변이 ──────────────────────────────────────────
export interface MutateDecl extends BaseNode {
  kind:      'MutateDecl';
  condition: Expr;
  role?:     string;
  membrane?: MembraneDecl;
  handlers?: HandlerDecl[];
}

// ══════════════════════════════════════════════════════════
//  Tissue / Organ / Organism · 조직 / 기관 / 유기체
// ══════════════════════════════════════════════════════════

export interface TissueDecl extends BaseNode {
  kind:     'TissueDecl';
  name:     string;
  membrane?: MembraneDecl;
  flow?:    FlowDecl;
  whens?:   WhenClause[];
}

export interface FlowDecl extends BaseNode {
  kind:     'FlowDecl';
  mode:     'linear' | 'parallel' | 'race';
  steps:    string[];    // cell/tissue names · 세포/조직 이름 목록
  after?:   AfterClause;
}

export interface AfterClause extends BaseNode {
  kind:  'AfterClause';
  mode:  'all' | 'any';
  stmts: Stmt[];
}

export interface WhenClause extends BaseNode {
  kind:      'WhenClause';
  condition: TypeExpr | Expr;
  body:      string[];   // cell names · 세포 이름 목록
}

export interface OrganDecl extends BaseNode {
  kind:     'OrganDecl';
  name:     string;
  membrane?: MembraneDecl;
  tissues:  string[];
  exports?: string[];
  shared?:  FieldDecl[];
}

export interface OrganismDecl extends BaseNode {
  kind:        'OrganismDecl';
  name:        string;
  organs:      string[];
  nervous?:    NervousDecl;
  immune?:     ImmuneDecl;
  environment?: EnvDecl;
}

export interface NervousDecl extends BaseNode {
  kind:   'NervousDecl';
  name:   string;
  routes: RouteDecl[];
}

export type RouteBranchKind = 'plain' | 'when' | 'always';

export interface RouteTransform extends BaseNode {
  kind:       'RouteTransform';
  paramName:  string;
  signalType: string;
  args?:      ArgList;
}

export interface RouteDecl extends BaseNode {
  kind:        'RouteDecl';
  source:      string;        // "OrganName.SignalName"
  targets:     string[];
  branchKind?: RouteBranchKind;
  condition?:  Expr;
  transform?:  RouteTransform;
}

export interface ImmuneDecl extends BaseNode {
  kind:      'ImmuneDecl';
  name:      string;
  policies:  ImmunePolicyDecl[];
  circuit?:  CircuitBreakerDecl;
}

export interface ImmunePolicyDecl extends BaseNode {
  kind:      'ImmunePolicyDecl';
  errorType: string;
  strategy:  'retry' | 'quarantine' | 'fallback' | 'deadLetter' | 'isolate';
  retries?:  number;
  backoff?:  'linear' | 'exponential';
  fallback?: string;
  escalate?: boolean;
}

export interface CircuitBreakerDecl extends BaseNode {
  kind:       'CircuitBreakerDecl';
  threshold:  number;
  windowSecs: number;
  openSecs:   number;
  probes:     number;
}

export interface EnvDecl extends BaseNode {
  kind:      'EnvDecl';
  runtime?:  string;
  transport?: string;
  scale?:    'auto' | 'manual';
  observe?:  string;
}

// ══════════════════════════════════════════════════════════
//  Genome · 유전자 템플릿
// ══════════════════════════════════════════════════════════

export interface GenomeDecl extends BaseNode {
  kind:    'GenomeDecl';
  name:    string;
  params:  string[];   // generic type parameters · 제네릭 타입 파라미터
  body:    CellBody;
}

// ══════════════════════════════════════════════════════════
//  Statements · 문장
// ══════════════════════════════════════════════════════════

export type Stmt =
  | EmitStmt
  | AbsorbStmt
  | LetStmt
  | IfStmt
  | ExprStmt
  | ReturnStmt;

export interface EmitStmt extends BaseNode {
  kind:      'EmitStmt';
  signalName: string;
  args?:     ArgList;
}

export interface AbsorbStmt extends BaseNode {
  kind: 'AbsorbStmt';
}

export interface LetStmt extends BaseNode {
  kind:  'LetStmt';
  name:  string;
  value: Expr;
}

export interface IfStmt extends BaseNode {
  kind:       'IfStmt';
  condition:  Expr;
  then:       Stmt[];
  otherwise?: Stmt[];
}

export interface ExprStmt extends BaseNode {
  kind: 'ExprStmt';
  expr: Expr;
}

export interface ReturnStmt extends BaseNode {
  kind:  'ReturnStmt';
  value?: Expr;
}

// ══════════════════════════════════════════════════════════
//  Expressions · 표현식
// ══════════════════════════════════════════════════════════

export type Expr =
  | LiteralExpr
  | IdentExpr
  | MemberExpr
  | CallExpr
  | BinaryExpr
  | UnaryExpr
  | TernaryExpr;

export interface LiteralExpr extends BaseNode {
  kind:  'LiteralExpr';
  value: string | number | boolean;
}

export interface IdentExpr extends BaseNode {
  kind: 'IdentExpr';
  name: string;
}

export interface MemberExpr extends BaseNode {
  kind:   'MemberExpr';
  object: Expr;
  prop:   string;
}

export interface CallExpr extends BaseNode {
  kind:   'CallExpr';
  callee: Expr;
  args:   Expr[];
}

export interface BinaryExpr extends BaseNode {
  kind:  'BinaryExpr';
  op:    string;
  left:  Expr;
  right: Expr;
}

export interface UnaryExpr extends BaseNode {
  kind:  'UnaryExpr';
  op:    string;
  expr:  Expr;
}

export interface TernaryExpr extends BaseNode {
  kind:      'TernaryExpr';
  condition: Expr;
  then:      Expr;
  otherwise: Expr;
}

export type ArgList = Record<string, Expr>;
