// ═══════════════════════════════════════════════════════════
//  Cell Coding — Type Checker
//  AST를 분석해 막 계약, 신호 타입, 불변 규칙을 검증한다
// ═══════════════════════════════════════════════════════════

import * as AST from './ast.js';

export interface TypeCheckError {
  message: string;
  pos:     AST.Position;
  kind:    'error' | 'warning';
}

interface SignalInfo {
  name:   string;
  fields: Map<string, AST.TypeExpr>;
}

interface CellInfo {
  name:    string;
  role:    string;
  accepts: Set<string>;
  emits:   Set<string>;
}

export class TypeChecker {
  private errors:  TypeCheckError[] = [];
  private signals: Map<string, SignalInfo> = new Map();
  private cells:   Map<string, CellInfo>   = new Map();
  private genomes: Map<string, AST.GenomeDecl> = new Map();
  private organs:  Set<string> = new Set();

  check(program: AST.Program): TypeCheckError[] {
    // 1패스: 모든 선언 수집
    for (const decl of program.statements) {
      this.collect(decl);
    }
    // 2패스: 규칙 검증
    for (const decl of program.statements) {
      this.validate(decl);
    }
    return this.errors;
  }

  // ── 1패스: 수집 ───────────────────────────────────────────

  private collect(decl: AST.TopLevelDecl): void {
    switch (decl.kind) {
      case 'SignalDecl': {
        const fields = new Map<string, AST.TypeExpr>();
        for (const f of decl.fields) fields.set(f.name, f.typeExpr);
        this.signals.set(decl.name, { name: decl.name, fields });
        break;
      }
      case 'CellDecl': {
        const { membrane } = decl.body;
        const accepts = new Set<string>(this.extractTypeNames(membrane.accepts));
        const emits   = new Set<string>(this.extractTypeNames(membrane.emits));
        this.cells.set(decl.name, { name: decl.name, role: decl.body.role, accepts, emits });
        break;
      }
      case 'OrganDecl':
        this.organs.add(decl.name);
        break;
      case 'GenomeDecl':
        this.genomes.set(decl.name, decl);
        break;
    }
  }

  // ── 2패스: 검증 ───────────────────────────────────────────

  private validate(decl: AST.TopLevelDecl): void {
    switch (decl.kind) {
      case 'CellDecl':     this.validateCell(decl);     break;
      case 'TissueDecl':   this.validateTissue(decl);   break;
      case 'OrganDecl':    this.validateOrgan(decl);    break;
      case 'OrganismDecl': this.validateOrganism(decl); break;
      case 'GenomeDecl':   this.validateGenome(decl);   break;
    }
  }

  // ── Cell 검증 ─────────────────────────────────────────────

  private validateCell(decl: AST.CellDecl): void {
    const { body, name } = decl;

    // 규칙 1: role 필수
    if (!body.role || body.role.trim() === '') {
      this.error(`Cell '${name}' must declare a non-empty role`, decl.pos);
    }

    // 규칙 2: membrane 필수 (파서에서 이미 체크하지만 이중 검증)
    if (!body.membrane) {
      this.error(`Cell '${name}' must have a membrane declaration`, decl.pos);
      return;
    }

    // 규칙 3: 핸들러가 최소 1개
    if (body.handlers.length === 0) {
      this.warn(`Cell '${name}' has no 'on' handlers — it will never react to signals`, decl.pos);
    }

    // 규칙 4: accepts에 선언된 신호를 처리하는 핸들러 존재 여부
    const { membrane } = body;
    if (membrane.accepts) {
      const acceptedTypes = this.extractTypeNames(membrane.accepts);
      const handledTypes  = new Set(body.handlers.map(h => h.signalType));
      for (const sig of acceptedTypes) {
        if (!handledTypes.has(sig)) {
          this.warn(
            `Cell '${name}' accepts '${sig}' but has no 'on(${sig})' handler`,
            membrane.pos
          );
        }
      }
    }

    // 규칙 5: emits에 없는 신호를 emit하면 안 됨
    if (membrane.emits) {
      const allowedEmits = new Set(this.extractTypeNames(membrane.emits));
      for (const handler of body.handlers) {
        this.checkHandlerEmits(handler, allowedEmits, name);
      }
    }

    // 규칙 6: genome 존재 여부
    if (decl.fromGenome && !this.genomes.has(decl.fromGenome)) {
      this.error(`Cell '${name}' references unknown genome '${decl.fromGenome}'`, decl.pos);
    }

    // 규칙 7: lifespan=persistent이면 nucleus 필요
    if (body.lifespan === 'persistent' && !body.nucleus) {
      this.warn(
        `Cell '${name}' has lifespan 'persistent' but no nucleus — state won't be preserved`,
        decl.pos
      );
    }
  }

  private checkHandlerEmits(
    handler: AST.HandlerDecl,
    allowed: Set<string>,
    cellName: string
  ): void {
    const emitted = this.collectEmits(handler.body);
    for (const sig of emitted) {
      if (!allowed.has(sig) && sig !== 'NullSignal') {
        this.error(
          `Cell '${cellName}' emits '${sig}' in on(${handler.signalType}) but '${sig}' is not declared in membrane.emits`,
          handler.pos
        );
      }
    }
  }

  private collectEmits(stmts: AST.Stmt[]): Set<string> {
    const result = new Set<string>();
    for (const stmt of stmts) {
      if (stmt.kind === 'EmitStmt') result.add(stmt.signalName);
      if (stmt.kind === 'IfStmt') {
        for (const s of this.collectEmits(stmt.then)) result.add(s);
        if (stmt.otherwise) for (const s of this.collectEmits(stmt.otherwise)) result.add(s);
      }
    }
    return result;
  }

  // ── Tissue 검증 ───────────────────────────────────────────

  private validateTissue(decl: AST.TissueDecl): void {
    const { flow } = decl;
    if (!flow) return;

    for (const step of flow.steps) {
      if (!this.cells.has(step) && !this.genomes.has(step)) {
        this.warn(
          `Tissue '${decl.name}' references unknown cell/genome '${step}' in flow`,
          decl.pos
        );
      }
    }

    // 선형 흐름: A의 emit이 B의 accept와 호환되어야 한다
    if (flow.mode === 'linear' && flow.steps.length >= 2) {
      for (let i = 0; i < flow.steps.length - 1; i++) {
        const sender   = this.cells.get(flow.steps[i]);
        const receiver = this.cells.get(flow.steps[i + 1]);
        if (!sender || !receiver) continue;
        const compatible = [...sender.emits].some(sig => receiver.accepts.has(sig));
        if (!compatible) {
          this.warn(
            `Tissue '${decl.name}': no signal overlap between '${flow.steps[i]}' (emits: ${[...sender.emits].join(',')}) and '${flow.steps[i + 1]}' (accepts: ${[...receiver.accepts].join(',')})`,
            decl.pos
          );
        }
      }
    }
  }

  // ── Organ 검증 ────────────────────────────────────────────

  private validateOrgan(decl: AST.OrganDecl): void {
    // exports에 선언된 신호가 내부 세포에서 emit되어야 함
    for (const exp of (decl.exports ?? [])) {
      const emittedBySome = [...this.cells.values()].some(c => c.emits.has(exp));
      if (!emittedBySome) {
        this.warn(
          `Organ '${decl.name}' exports '${exp}' but no cell emits this signal`,
          decl.pos
        );
      }
    }
  }

  // ── Organism 검증 ─────────────────────────────────────────

  private validateOrganism(decl: AST.OrganismDecl): void {
    for (const organName of decl.organs) {
      if (!this.organs.has(organName)) {
        this.warn(
          `Organism '${decl.name}' references unknown organ '${organName}'`,
          decl.pos
        );
      }
    }

    // nervous 라우팅 검증
    if (decl.nervous) {
      for (const route of decl.nervous.routes) {
        if (route.targets.length === 0) {
          this.warn(
            `Nervous system route '${route.source}' has no targets`,
            route.pos
          );
        }
      }
    }
  }

  // ── Genome 검증 ───────────────────────────────────────────

  private validateGenome(decl: AST.GenomeDecl): void {
    if (decl.params.length === 0) {
      this.warn(
        `Genome '${decl.name}' has no type parameters — consider using 'cell' instead`,
        decl.pos
      );
    }
  }

  // ── 헬퍼 ──────────────────────────────────────────────────

  private extractTypeNames(type?: AST.TypeExpr): string[] {
    if (!type) return [];
    switch (type.kind) {
      case 'SimpleType':  return [type.name];
      case 'UnionType':   return type.types.flatMap(t => this.extractTypeNames(t));
      case 'GenericType': return [type.name];
      default:            return [];
    }
  }

  private error(message: string, pos: AST.Position): void {
    this.errors.push({ message, pos, kind: 'error' });
  }

  private warn(message: string, pos: AST.Position): void {
    this.errors.push({ message, pos, kind: 'warning' });
  }
}
