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
  name:    string;
  extends?: string;
  fields:  Map<string, AST.TypeExpr>;
  pos:     AST.Position;
}

interface CellInfo {
  name:    string;
  role:    string;
  accepts: Set<string>;
  emits:   Set<string>;
}

const PRIORITY_LEVELS = new Set(['critical', 'high', 'normal', 'low']);
const LIFESPAN_VALUES = new Set(['stateless', 'persistent', 'session']);

export class TypeChecker {
  private errors:  TypeCheckError[] = [];
  private signals: Map<string, SignalInfo> = new Map();
  private cells:   Map<string, CellInfo>   = new Map();
  private genomes: Map<string, AST.GenomeDecl> = new Map();
  private organs:  Set<string> = new Set();

  check(program: AST.Program): TypeCheckError[] {
    for (const decl of program.statements) {
      this.collect(decl);
    }
    this.finalizeSignals();
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
        this.signals.set(decl.name, {
          name: decl.name,
          extends: decl.extends,
          fields,
          pos: decl.pos,
        });
        break;
      }
      case 'CellDecl': {
        const { membrane } = decl.body;
        const accepts = new Set<string>(this.extractSignalNames(membrane.accepts));
        const emits   = new Set<string>(this.extractSignalNames(membrane.emits));
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

  /** extends 체인을 따라 부모 필드를 병합하고, unknown extends를 검증한다 */
  private finalizeSignals(): void {
    for (const [name, info] of this.signals) {
      const merged = new Map(info.fields);
      let parent = info.extends;
      const visited = new Set<string>([name]);

      while (parent) {
        if (!this.signals.has(parent)) {
          this.error(`Signal '${name}' extends unknown signal '${parent}'`, info.pos);
          break;
        }
        if (visited.has(parent)) {
          this.error(`Signal '${name}' has cyclic extends chain involving '${parent}'`, info.pos);
          break;
        }
        visited.add(parent);
        const parentInfo = this.signals.get(parent)!;
        for (const [field, typeExpr] of parentInfo.fields) {
          if (!merged.has(field)) merged.set(field, typeExpr);
        }
        parent = parentInfo.extends;
      }

      this.signals.set(name, { ...info, fields: merged });
    }
  }

  // ── 2패스: 검증 ───────────────────────────────────────────

  private validate(decl: AST.TopLevelDecl): void {
    switch (decl.kind) {
      case 'SignalDecl':   this.validateSignal(decl);     break;
      case 'CellDecl':     this.validateCell(decl);     break;
      case 'TissueDecl':   this.validateTissue(decl);   break;
      case 'OrganDecl':    this.validateOrgan(decl);    break;
      case 'OrganismDecl': this.validateOrganism(decl); break;
      case 'GenomeDecl':   this.validateGenome(decl);   break;
    }
  }

  private validateSignal(decl: AST.SignalDecl): void {
    if (decl.priority && !PRIORITY_LEVELS.has(decl.priority)) {
      this.error(
        `Signal '${decl.name}' has invalid priority '${decl.priority}' (expected critical|high|normal|low)`,
        decl.pos
      );
    }
  }

  // ── Cell 검증 ─────────────────────────────────────────────

  private validateCell(decl: AST.CellDecl): void {
    const { body, name } = decl;

    if (!body.role || body.role.trim() === '') {
      this.error(`Cell '${name}' must declare a non-empty role`, decl.pos);
    }

    if (!body.membrane) {
      this.error(`Cell '${name}' must have a membrane declaration`, decl.pos);
      return;
    }

    if (body.lifespan && !LIFESPAN_VALUES.has(body.lifespan)) {
      this.error(
        `Cell '${name}' has invalid lifespan '${body.lifespan}' (expected stateless|persistent|session)`,
        decl.pos
      );
    }

    if (body.handlers.length === 0) {
      this.error(`Cell '${name}' must declare at least one 'on' handler`, decl.pos);
    }

    const { membrane } = body;

    if (membrane.acceptsIsQuery) {
      for (const handler of body.handlers) {
        if (handler.isQuery) {
          this.warn(
            `Cell '${name}': 'query' on handler on(${handler.signalType}) is redundant — use 'accepts: Type query' on membrane (spec §5)`,
            handler.pos
          );
        }
      }
    }

    if (membrane.accepts) {
      const acceptedTypes = this.extractSignalNames(membrane.accepts);
      for (const sig of acceptedTypes) {
        const hasHandler = body.handlers.some(h =>
          this.signalsCompatible(h.signalType, sig)
        );
        if (!hasHandler) {
          this.warn(
            `Cell '${name}' accepts '${sig}' but has no compatible 'on(...)' handler`,
            membrane.pos
          );
        }
      }
    }

    if (membrane.emits) {
      const allowedEmits = this.extractSignalNames(membrane.emits);
      for (const handler of body.handlers) {
        this.checkHandlerEmits(handler, allowedEmits, name);
      }
    }

    if (decl.fromGenome && !this.genomes.has(decl.fromGenome)) {
      this.error(`Cell '${name}' references unknown genome '${decl.fromGenome}'`, decl.pos);
    }

    if (body.lifespan === 'persistent' && !body.nucleus) {
      this.warn(
        `Cell '${name}' has lifespan 'persistent' but no nucleus — state won't be preserved`,
        decl.pos
      );
    }
  }

  private checkHandlerEmits(
    handler: AST.HandlerDecl,
    allowed: string[],
    cellName: string
  ): void {
    const emitted = this.collectEmits(handler.body);
    for (const sig of emitted) {
      const ok = sig === 'NullSignal' || allowed.some(a => this.signalsCompatible(sig, a));
      if (!ok) {
        this.error(
          `Cell '${cellName}' emits '${sig}' in on(${handler.signalType}) but '${sig}' is not compatible with membrane.emits`,
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

    if (flow.mode === 'linear' && flow.steps.length >= 2) {
      for (let i = 0; i < flow.steps.length - 1; i++) {
        const sender   = this.cells.get(flow.steps[i]);
        const receiver = this.cells.get(flow.steps[i + 1]);
        if (!sender || !receiver) continue;
        const compatible = [...sender.emits].some(emitted =>
          [...receiver.accepts].some(accepted => this.signalsCompatible(emitted, accepted))
        );
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
    for (const exp of (decl.exports ?? [])) {
      const emittedBySome = [...this.cells.values()].some(c =>
        [...c.emits].some(e => this.signalsCompatible(e, exp))
      );
      if (!emittedBySome) {
        this.warn(
          `Organ '${decl.name}' exports '${exp}' but no cell emits a compatible signal`,
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
    this.validateCellBody(decl.name, decl.body, decl.pos);
  }

  private validateCellBody(label: string, body: AST.CellBody, pos: AST.Position): void {
    if (body.handlers.length === 0) {
      this.error(`${label} must declare at least one 'on' handler`, pos);
    }
  }

  // ── 헬퍼 ──────────────────────────────────────────────────

  /** 막/핸들러/emit에서 사용하는 신호 이름 추출 (제네릭·컨테이너 내부 포함) */
  private extractSignalNames(type?: AST.TypeExpr): string[] {
    if (!type) return [];
    switch (type.kind) {
      case 'SimpleType':
        return [type.name];
      case 'UnionType':
        return type.types.flatMap(t => this.extractSignalNames(t));
      case 'GenericType':
        return [type.name, ...type.params.flatMap(p => this.extractSignalNames(p))];
      case 'ListType':
        return this.extractSignalNames(type.item);
      case 'MapType':
        return [
          ...this.extractSignalNames(type.key),
          ...this.extractSignalNames(type.value),
        ];
      case 'OptionType':
        return this.extractSignalNames(type.inner);
      case 'ResultType':
        return [
          ...this.extractSignalNames(type.ok),
          ...this.extractSignalNames(type.err),
        ];
      default:
        return [];
    }
  }

  /** emitted가 accepted 막 계약을 만족하는지 (extends/subtype 포함, spec §11) */
  private signalsCompatible(emitted: string, accepted: string): boolean {
    if (emitted === accepted) return true;
    return this.isSubtypeOf(emitted, accepted);
  }

  private isSubtypeOf(sub: string, superType: string): boolean {
    let cur = this.signals.get(sub)?.extends;
    const visited = new Set<string>();
    while (cur) {
      if (cur === superType) return true;
      if (visited.has(cur)) return false;
      visited.add(cur);
      cur = this.signals.get(cur)?.extends;
    }
    return false;
  }

  private error(message: string, pos: AST.Position): void {
    this.errors.push({ message, pos, kind: 'error' });
  }

  private warn(message: string, pos: AST.Position): void {
    this.errors.push({ message, pos, kind: 'warning' });
  }
}
