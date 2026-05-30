// ═══════════════════════════════════════════════════════════
//  Cell Coding — Parser
//  Builds an AST from the token stream.
//  토큰 스트림에서 AST(추상 구문 트리)를 생성한다.
// ═══════════════════════════════════════════════════════════

import { Token, TokenType } from './lexer.js';
import * as AST from './ast.js';

export class ParseError extends Error {
  constructor(msg: string, public token: Token) {
    super(`[Parse Error] ${msg} at ${token.line}:${token.col} (got '${token.value}')`);
  }
}

export class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  // ── Utilities · 유틸리티 ─────────────────────────────────

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    if (t.type !== TokenType.EOF) this.pos++;
    return t;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    if (types.includes(this.peek().type)) { this.advance(); return true; }
    return false;
  }

  private expect(type: TokenType, hint?: string): Token {
    if (!this.check(type)) throw new ParseError(hint ?? `Expected '${type}'`, this.peek());
    return this.advance();
  }

  private pos2(): AST.Position {
    return { line: this.peek().line, col: this.peek().col };
  }

  // ── Top-level ─────────────────────────────────────────────

  parse(): AST.Program {
    const pos = this.pos2();
    const statements: AST.TopLevelDecl[] = [];

    while (!this.check(TokenType.EOF)) {
      statements.push(this.parseTopLevel());
    }

    return { kind: 'Program', pos, statements };
  }

  private parseTopLevel(): AST.TopLevelDecl {
    const t = this.peek();
    switch (t.type) {
      case TokenType.SIGNAL:   return this.parseSignalDecl();
      case TokenType.CELL:     return this.parseCellDecl();
      case TokenType.TISSUE:   return this.parseTissueDecl();
      case TokenType.ORGAN:    return this.parseOrganDecl();
      case TokenType.ORGANISM: return this.parseOrganismDecl();
      case TokenType.GENOME:   return this.parseGenomeDecl();
      default:
        throw new ParseError(`Unexpected top-level token '${t.value}'`, t);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  Signal
  // ══════════════════════════════════════════════════════════

  private parseSignalDecl(): AST.SignalDecl {
    const pos = this.pos2();
    this.expect(TokenType.SIGNAL);
    const name = this.expect(TokenType.IDENTIFIER, 'Expected signal name').value;

    let extendsName: string | undefined;
    if (this.match(TokenType.EXTENDS)) {
      extendsName = this.expect(TokenType.IDENTIFIER).value;
    }

    let priority: AST.SignalDecl['priority'];
    if (this.match(TokenType.PRIORITY)) {
      this.expect(TokenType.COLON);
      priority = this.advance().value as AST.SignalDecl['priority'];
    }

    const fields: AST.FieldDecl[] = [];
    if (this.check(TokenType.LBRACE)) {
      this.advance();
      while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
        fields.push(this.parseFieldDecl());
      }
      this.expect(TokenType.RBRACE);
    }

    return { kind: 'SignalDecl', pos, name, extends: extendsName, priority, fields };
  }

  // ══════════════════════════════════════════════════════════
  //  Cell
  // ══════════════════════════════════════════════════════════

  private parseCellDecl(): AST.CellDecl {
    const pos = this.pos2();
    this.expect(TokenType.CELL);
    const name = this.expect(TokenType.IDENTIFIER, 'Expected cell name').value;

    let fromGenome: string | undefined;
    if (this.match(TokenType.FROM)) {
      fromGenome = this.expect(TokenType.IDENTIFIER).value;
      // Skip generic args on `from Genome<T>` · from Genome<T> 제네릭 인자 건너뜀
      if (this.check(TokenType.LANGLE)) this.skipGenerics();
    }

    const withGenomes: string[] = [];
    if (this.match(TokenType.WITH)) {
      withGenomes.push(this.expect(TokenType.IDENTIFIER).value);
      while (this.match(TokenType.COMMA)) {
        withGenomes.push(this.expect(TokenType.IDENTIFIER).value);
      }
    }

    this.expect(TokenType.LBRACE);
    const body = this.parseCellBody();
    this.expect(TokenType.RBRACE);

    return { kind: 'CellDecl', pos, name, fromGenome, withGenomes, body };
  }

  private parseCellBody(): AST.CellBody {
    let role = '';
    let tags: string[] | undefined;
    let lifespan: AST.CellBody['lifespan'];
    let membrane: AST.MembraneDecl | undefined;
    let nucleus: AST.NucleusDecl | undefined;
    const handlers: AST.HandlerDecl[] = [];
    let apoptosis: AST.ApoptosisDecl | undefined;
    let divide: AST.DivideDecl | undefined;
    let mutate: AST.MutateDecl | undefined;

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();

      if (t.type === TokenType.ROLE) {
        this.advance();
        this.expect(TokenType.COLON);
        role = this.expect(TokenType.STRING, 'Expected role string').value;

      } else if (t.type === TokenType.TAGS) {
        this.advance(); this.expect(TokenType.COLON);
        tags = this.parseStringArray();

      } else if (t.type === TokenType.LIFESPAN) {
        this.advance(); this.expect(TokenType.COLON);
        lifespan = this.advance().value as AST.CellBody['lifespan'];

      } else if (t.type === TokenType.MEMBRANE) {
        membrane = this.parseMembraneDecl();

      } else if (t.type === TokenType.NUCLEUS) {
        nucleus = this.parseNucleusDecl();

      } else if (t.type === TokenType.ON) {
        handlers.push(this.parseHandlerDecl());

      } else if (t.type === TokenType.APOPTOSIS) {
        apoptosis = this.parseApoptosisDecl();

      } else if (t.type === TokenType.DIVIDE) {
        divide = this.parseDivideDecl();

      } else if (t.type === TokenType.MUTATE) {
        mutate = this.parseMutateDecl();

      } else {
        // Skip unknown tokens (forward-compatible) · 알 수 없는 토큰 건너뜀
        this.advance();
      }

      // Optional semicolon · 선택적 세미콜론
      this.match(TokenType.SEMICOLON);
    }

    if (!role) throw new ParseError('Cell must have a role declaration', this.peek());
    if (!membrane) throw new ParseError('Cell must have a membrane declaration', this.peek());

    return { role, tags, lifespan, membrane, nucleus, handlers, apoptosis, divide, mutate };
  }

  // ── Membrane ──────────────────────────────────────────────

  private parseMembraneDecl(): AST.MembraneDecl {
    const pos = this.pos2();
    this.expect(TokenType.MEMBRANE);
    this.expect(TokenType.LBRACE);

    let accepts: AST.TypeExpr | undefined;
    let acceptsIsQuery = false;
    let emits: AST.TypeExpr | undefined;
    let rejects: AST.TypeExpr | undefined;
    let observes: AST.TypeExpr | undefined;
    let passthrough: AST.TypeExpr | undefined;

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.type === TokenType.ACCEPTS) {
        this.advance();
        this.expect(TokenType.COLON);
        accepts = this.parseTypeExpr();
        acceptsIsQuery = this.match(TokenType.QUERY);
      } else if (t.type === TokenType.EMITS) {
        this.advance(); this.expect(TokenType.COLON); emits = this.parseTypeExpr();
      } else if (t.type === TokenType.REJECTS) {
        this.advance(); this.expect(TokenType.COLON); rejects = this.parseTypeExpr();
      } else if (t.type === TokenType.OBSERVES) {
        this.advance(); this.expect(TokenType.COLON); observes = this.parseTypeExpr();
      } else if (t.value === 'passthrough') {
        this.advance(); this.expect(TokenType.COLON); passthrough = this.parseTypeExpr();
      } else {
        this.advance();
      }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'MembraneDecl', pos, accepts, acceptsIsQuery, emits, rejects, observes, passthrough };
  }

  // ── Nucleus ───────────────────────────────────────────────

  private parseNucleusDecl(): AST.NucleusDecl {
    const pos = this.pos2();
    this.expect(TokenType.NUCLEUS);
    this.expect(TokenType.LBRACE);
    const fields: AST.FieldDecl[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      fields.push(this.parseFieldDecl());
    }
    this.expect(TokenType.RBRACE);
    return { kind: 'NucleusDecl', pos, fields };
  }

  // ── Handler ───────────────────────────────────────────────

  private parseHandlerDecl(): AST.HandlerDecl {
    const pos = this.pos2();
    this.expect(TokenType.ON);
    this.expect(TokenType.LPAREN);
    const signalType = this.expect(TokenType.IDENTIFIER).value;
    const isQuery = this.match(TokenType.QUERY);
    const paramName = this.check(TokenType.IDENTIFIER) ? this.advance().value : 'input';
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    const body = this.parseStmtList();
    this.expect(TokenType.RBRACE);
    return { kind: 'HandlerDecl', pos, signalType, paramName, isQuery, body };
  }

  // ── Apoptosis ─────────────────────────────────────────────

  private parseApoptosisDecl(): AST.ApoptosisDecl {
    const pos = this.pos2();
    this.expect(TokenType.APOPTOSIS);
    this.expect(TokenType.LBRACE);
    const body = this.parseStmtList();
    this.expect(TokenType.RBRACE);
    return { kind: 'ApoptosisDecl', pos, body };
  }

  // ── Divide ────────────────────────────────────────────────

  private parseDivideDecl(): AST.DivideDecl {
    const pos = this.pos2();
    this.expect(TokenType.DIVIDE);
    this.expect(TokenType.WHEN);
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpr();
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);

    let max = 8;
    let strategy: AST.DivideDecl['strategy'] = 'round-robin';

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.value === 'max') {
        this.advance(); this.expect(TokenType.COLON);
        max = parseInt(this.expect(TokenType.NUMBER).value, 10);
      } else if (t.value === 'strategy') {
        this.advance(); this.expect(TokenType.COLON);
        strategy = this.advance().value as AST.DivideDecl['strategy'];
      } else {
        this.advance();
      }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'DivideDecl', pos, condition, max, strategy };
  }

  // ── Mutate ────────────────────────────────────────────────

  private parseMutateDecl(): AST.MutateDecl {
    const pos = this.pos2();
    this.expect(TokenType.MUTATE);
    this.expect(TokenType.WHEN);
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpr();
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);

    let role: string | undefined;
    let membrane: AST.MembraneDecl | undefined;
    const handlers: AST.HandlerDecl[] = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.type === TokenType.ROLE) {
        this.advance(); this.expect(TokenType.COLON);
        role = this.expect(TokenType.STRING).value;
      } else if (t.type === TokenType.MEMBRANE) {
        membrane = this.parseMembraneDecl();
      } else if (t.type === TokenType.ON) {
        handlers.push(this.parseHandlerDecl());
      } else {
        this.advance();
      }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'MutateDecl', pos, condition, role, membrane, handlers };
  }

  // ══════════════════════════════════════════════════════════
  //  Tissue / Organ / Organism / Genome
  // ══════════════════════════════════════════════════════════

  private parseTissueDecl(): AST.TissueDecl {
    const pos = this.pos2();
    this.expect(TokenType.TISSUE);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    let membrane: AST.MembraneDecl | undefined;
    let flow: AST.FlowDecl | undefined;
    const whens: AST.WhenClause[] = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.type === TokenType.MEMBRANE)  { membrane = this.parseMembraneDecl(); }
      else if (t.type === TokenType.FLOW) { flow = this.parseFlowDecl(); }
      else if (t.type === TokenType.WHEN) { whens.push(this.parseWhenClause()); }
      else { this.advance(); }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'TissueDecl', pos, name, membrane, flow, whens };
  }

  private parseFlowDecl(): AST.FlowDecl {
    const pos = this.pos2();
    this.expect(TokenType.FLOW);
    let mode: AST.FlowDecl['mode'] = 'linear';
    if (!this.check(TokenType.LBRACE)) {
      mode = this.advance().value as AST.FlowDecl['mode'];
    }
    this.expect(TokenType.LBRACE);

    const steps: string[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      if (this.peek().type === TokenType.IDENTIFIER) {
        steps.push(this.advance().value);
      }
      this.match(TokenType.ARROW); this.match(TokenType.ARROW_ASCII);
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.RBRACE);
    return { kind: 'FlowDecl', pos, mode, steps };
  }

  private parseWhenClause(): AST.WhenClause {
    const pos = this.pos2();
    this.expect(TokenType.WHEN);
    this.expect(TokenType.LPAREN);
    const condition = this.parseTypeExpr();
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    const body: string[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      if (this.peek().type === TokenType.IDENTIFIER) body.push(this.advance().value);
      else this.advance();
    }
    this.expect(TokenType.RBRACE);
    return { kind: 'WhenClause', pos, condition, body };
  }

  private parseOrganDecl(): AST.OrganDecl {
    const pos = this.pos2();
    this.expect(TokenType.ORGAN);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    let membrane: AST.MembraneDecl | undefined;
    const tissues: string[] = [];
    const exports: string[] = [];
    const shared: AST.FieldDecl[] = [];

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.type === TokenType.MEMBRANE) {
        membrane = this.parseMembraneDecl();
      } else if (t.value === 'tissues') {
        this.advance(); this.expect(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
          if (this.peek().type === TokenType.IDENTIFIER) tissues.push(this.advance().value);
          else this.advance();
        }
        this.expect(TokenType.RBRACE);
      } else if (t.type === TokenType.EXPORTS) {
        this.advance(); this.expect(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
          if (this.peek().type === TokenType.IDENTIFIER) exports.push(this.advance().value);
          else this.advance();
        }
        this.expect(TokenType.RBRACE);
      } else if (t.type === TokenType.SHARED) {
        this.advance(); this.expect(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
          shared.push(this.parseFieldDecl());
        }
        this.expect(TokenType.RBRACE);
      } else {
        this.advance();
      }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'OrganDecl', pos, name, membrane, tissues, exports, shared };
  }

  private parseOrganismDecl(): AST.OrganismDecl {
    const pos = this.pos2();
    this.expect(TokenType.ORGANISM);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const organs: string[] = [];
    let nervous: AST.NervousDecl | undefined;
    let immune: AST.ImmuneDecl | undefined;
    let environment: AST.EnvDecl | undefined;

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.value === 'organs') {
        this.advance(); this.expect(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
          if (this.peek().type === TokenType.IDENTIFIER) organs.push(this.advance().value);
          else this.advance();
        }
        this.expect(TokenType.RBRACE);
      } else if (t.type === TokenType.NERVOUS) {
        nervous = this.parseNervousDecl();
      } else if (t.type === TokenType.IMMUNE) {
        immune = this.parseImmuneDecl();
      } else if (t.value === 'environment') {
        environment = this.parseEnvDecl();
      } else {
        this.advance();
      }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'OrganismDecl', pos, name, organs, nervous, immune, environment };
  }

  private parseNervousDecl(): AST.NervousDecl {
    const pos = this.pos2();
    this.expect(TokenType.NERVOUS);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const routes: AST.RouteDecl[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const rpos = this.pos2();
      if (this.peek().type === TokenType.IDENTIFIER) {
        const source = this.advance().value +
          (this.match(TokenType.DOT) ? '.' + this.advance().value : '');
        this.match(TokenType.ARROW); this.match(TokenType.ARROW_ASCII);
        const targets: string[] = [];
        if (this.check(TokenType.LBRACKET)) {
          this.advance();
          while (!this.check(TokenType.RBRACKET) && !this.check(TokenType.EOF)) {
            if (this.peek().type === TokenType.IDENTIFIER) targets.push(this.advance().value);
            this.match(TokenType.COMMA);
          }
          this.expect(TokenType.RBRACKET);
        } else if (this.peek().type === TokenType.IDENTIFIER) {
          targets.push(this.advance().value);
        }
        routes.push({ kind: 'RouteDecl', pos: rpos, source, targets });
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'NervousDecl', pos, name, routes };
  }

  private parseImmuneDecl(): AST.ImmuneDecl {
    const pos = this.pos2();
    this.expect(TokenType.IMMUNE);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const policies: AST.ImmunePolicyDecl[] = [];
    let circuit: AST.CircuitBreakerDecl | undefined;

    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.type === TokenType.ON) {
        const ppos = this.pos2();
        this.advance();
        const errorType = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.LBRACE);
        let strategy: AST.ImmunePolicyDecl['strategy'] = 'retry';
        let retries = 3;
        while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
          const pt = this.peek();
          if (pt.value === 'strategy') {
            this.advance(); this.expect(TokenType.COLON);
            strategy = this.advance().value as AST.ImmunePolicyDecl['strategy'];
          } else if (pt.value === 'retries' || pt.value === 'attempts') {
            this.advance(); this.expect(TokenType.COLON);
            retries = parseInt(this.advance().value, 10);
          } else { this.advance(); }
          this.match(TokenType.SEMICOLON);
        }
        this.expect(TokenType.RBRACE);
        policies.push({ kind: 'ImmunePolicyDecl', pos: ppos, errorType, strategy, retries });
      } else if (t.value === 'circuit') {
        circuit = this.parseCircuitBreaker();
      } else {
        this.advance();
      }
      this.match(TokenType.SEMICOLON);
    }

    this.expect(TokenType.RBRACE);
    return { kind: 'ImmuneDecl', pos, name, policies, circuit };
  }

  private parseCircuitBreaker(): AST.CircuitBreakerDecl {
    const pos = this.pos2();
    this.advance(); // 'circuit'
    this.expect(TokenType.LBRACE);
    let threshold = 5, windowSecs = 60, openSecs = 30, probes = 1;
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.value === 'threshold')  { this.advance(); this.expect(TokenType.COLON); threshold  = parseInt(this.advance().value); }
      else if (t.value === 'open')  { this.advance(); this.expect(TokenType.COLON); openSecs   = parseInt(this.advance().value); }
      else if (t.value === 'halfOpen') { this.advance(); this.expect(TokenType.COLON); probes = parseInt(this.advance().value); }
      else { this.advance(); }
      this.match(TokenType.SEMICOLON);
    }
    this.expect(TokenType.RBRACE);
    return { kind: 'CircuitBreakerDecl', pos, threshold, windowSecs, openSecs, probes };
  }

  private parseEnvDecl(): AST.EnvDecl {
    const pos = this.pos2();
    this.advance(); // 'environment'
    this.expect(TokenType.LBRACE);
    let runtime: string | undefined;
    let transport: string | undefined;
    let scale: AST.EnvDecl['scale'];
    let observe: string | undefined;
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      const t = this.peek();
      if (t.value === 'runtime')   { this.advance(); this.expect(TokenType.COLON); runtime   = this.advance().value; }
      else if (t.value === 'transport') { this.advance(); this.expect(TokenType.COLON); transport = this.advance().value; }
      else if (t.value === 'scale') { this.advance(); this.expect(TokenType.COLON); scale = this.advance().value as AST.EnvDecl['scale']; }
      else if (t.value === 'observe') { this.advance(); this.expect(TokenType.COLON); observe = this.advance().value; }
      else { this.advance(); }
      this.match(TokenType.SEMICOLON);
    }
    this.expect(TokenType.RBRACE);
    return { kind: 'EnvDecl', pos, runtime, transport, scale, observe };
  }

  private parseGenomeDecl(): AST.GenomeDecl {
    const pos = this.pos2();
    this.expect(TokenType.GENOME);
    const name = this.expect(TokenType.IDENTIFIER).value;
    const params: string[] = [];
    if (this.check(TokenType.LANGLE)) {
      this.advance();
      while (!this.check(TokenType.RANGLE) && !this.check(TokenType.EOF)) {
        if (this.peek().type === TokenType.IDENTIFIER) params.push(this.advance().value);
        this.match(TokenType.COMMA);
      }
      this.expect(TokenType.RANGLE);
    }
    this.expect(TokenType.LBRACE);
    const body = this.parseCellBody();
    this.expect(TokenType.RBRACE);
    return { kind: 'GenomeDecl', pos, name, params, body };
  }

  // ══════════════════════════════════════════════════════════
  //  Shared helpers · 공통 헬퍼
  // ══════════════════════════════════════════════════════════

  private parseFieldDecl(): AST.FieldDecl {
    const pos = this.pos2();
    const name = this.expect(TokenType.IDENTIFIER).value;
    const optional = this.match(TokenType.QUESTION);
    this.expect(TokenType.COLON);
    const typeExpr = this.parseTypeExpr();
    let def: AST.Expr | undefined;
    if (this.match(TokenType.ASSIGN)) def = this.parseExpr();
    this.match(TokenType.SEMICOLON);
    return { kind: 'FieldDecl', pos, name, typeExpr, optional, default: def };
  }

  private parseTypeExpr(): AST.TypeExpr {
    let type = this.parseSingleType();
    while (this.check(TokenType.PIPE)) {
      this.advance();
      const right = this.parseSingleType();
      if (type.kind === 'UnionType') {
        (type as AST.UnionType).types.push(right);
      } else {
        type = { kind: 'UnionType', pos: type.pos, types: [type, right] };
      }
    }
    return type;
  }

  private parseSingleType(): AST.TypeExpr {
    const pos = this.pos2();
    const name = this.expect(TokenType.IDENTIFIER, 'Expected type name').value;

    if (!this.check(TokenType.LANGLE)) {
      return { kind: 'SimpleType', pos, name };
    }

    this.advance();
    const first = this.parseTypeExpr();

    if (this.match(TokenType.COMMA)) {
      const second = this.parseTypeExpr();
      this.expect(TokenType.RANGLE);
      if (name === 'Map') {
        return { kind: 'MapType', pos, key: first, value: second };
      }
      if (name === 'Result') {
        return { kind: 'ResultType', pos, ok: first, err: second };
      }
      return { kind: 'GenericType', pos, name, params: [first, second] };
    }

    this.expect(TokenType.RANGLE);
    if (name === 'List') {
      return { kind: 'ListType', pos, item: first };
    }
    if (name === 'Option') {
      return { kind: 'OptionType', pos, inner: first };
    }
    return { kind: 'GenericType', pos, name, params: [first] };
  }

  private parseStmtList(): AST.Stmt[] {
    const stmts: AST.Stmt[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      stmts.push(this.parseStmt());
      this.match(TokenType.SEMICOLON);
    }
    return stmts;
  }

  private parseStmt(): AST.Stmt {
    const pos = this.pos2();
    const t = this.peek();

    if (t.type === TokenType.EMIT) {
      this.advance();
      const signalName = this.expect(TokenType.IDENTIFIER).value;
      let args: AST.ArgList | undefined;
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        args = this.parseArgList();
        this.expect(TokenType.RPAREN);
      }
      return { kind: 'EmitStmt', pos, signalName, args };
    }

    if (t.type === TokenType.ABSORB) {
      this.advance();
      return { kind: 'AbsorbStmt', pos };
    }

    if (t.type === TokenType.LET) {
      this.advance();
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.ASSIGN);
      const value = this.parseExpr();
      return { kind: 'LetStmt', pos, name, value };
    }

    if (t.type === TokenType.IF) {
      this.advance();
      this.expect(TokenType.LPAREN);
      const condition = this.parseExpr();
      this.expect(TokenType.RPAREN);
      this.expect(TokenType.LBRACE);
      const then = this.parseStmtList();
      this.expect(TokenType.RBRACE);
      let otherwise: AST.Stmt[] | undefined;
      if (this.match(TokenType.ELSE)) {
        this.expect(TokenType.LBRACE);
        otherwise = this.parseStmtList();
        this.expect(TokenType.RBRACE);
      }
      return { kind: 'IfStmt', pos, condition, then, otherwise };
    }

    if (t.type === TokenType.RETURN) {
      this.advance();
      const value = !this.check(TokenType.RBRACE) ? this.parseExpr() : undefined;
      return { kind: 'ReturnStmt', pos, value };
    }

    const expr = this.parseExpr();
    return { kind: 'ExprStmt', pos, expr };
  }

  private parseExpr(): AST.Expr {
    return this.parseBinary(0);
  }

  private PREC: Record<string, number> = {
    '||': 1, '&&': 2, '==': 3, '!=': 3,
    '<': 4, '>': 4, '<=': 4, '>=': 4,
    '+': 5, '-': 5, '*': 6, '/': 6,
  };

  private parseBinary(minPrec: number): AST.Expr {
    let left = this.parseUnary();
    while (true) {
      const op = this.peek().value;
      const prec = this.PREC[op] ?? -1;
      if (prec <= minPrec) break;
      const pos = this.pos2();
      this.advance();
      const right = this.parseBinary(prec);
      left = { kind: 'BinaryExpr', pos, op, left, right };
    }
    return left;
  }

  private parseUnary(): AST.Expr {
    const pos = this.pos2();
    if (this.check(TokenType.BANG)) {
      this.advance();
      return { kind: 'UnaryExpr', pos, op: '!', expr: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): AST.Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.check(TokenType.DOT)) {
        const pos = this.pos2();
        this.advance();
        const prop = this.expect(TokenType.IDENTIFIER).value;
        expr = { kind: 'MemberExpr', pos, object: expr, prop };
      } else if (this.check(TokenType.LPAREN)) {
        const pos = this.pos2();
        this.advance();
        const args: AST.Expr[] = [];
        while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
          args.push(this.parseExpr());
          this.match(TokenType.COMMA);
        }
        this.expect(TokenType.RPAREN);
        expr = { kind: 'CallExpr', pos, callee: expr, args };
      } else break;
    }
    return expr;
  }

  private parsePrimary(): AST.Expr {
    const pos = this.pos2();
    const t = this.peek();

    if (t.type === TokenType.NUMBER) {
      this.advance();
      return { kind: 'LiteralExpr', pos, value: parseFloat(t.value) };
    }
    if (t.type === TokenType.STRING) {
      this.advance();
      return { kind: 'LiteralExpr', pos, value: t.value };
    }
    if (t.type === TokenType.BOOLEAN) {
      this.advance();
      return { kind: 'LiteralExpr', pos, value: t.value === 'true' };
    }
    if (t.type === TokenType.IDENTIFIER) {
      this.advance();
      return { kind: 'IdentExpr', pos, name: t.value };
    }
    if (t.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    throw new ParseError(`Unexpected expression token '${t.value}'`, t);
  }

  private parseArgList(): AST.ArgList {
    const args: AST.ArgList = {};
    while (!this.check(TokenType.RPAREN) && !this.check(TokenType.EOF)) {
      const key = this.peek().type === TokenType.IDENTIFIER && this.peek(1).type === TokenType.COLON
        ? (this.advance().value)
        : '_';
      if (this.peek().type === TokenType.COLON) this.advance();
      args[key] = this.parseExpr();
      this.match(TokenType.COMMA);
    }
    return args;
  }

  private parseStringArray(): string[] {
    const items: string[] = [];
    this.expect(TokenType.LBRACKET);
    while (!this.check(TokenType.RBRACKET) && !this.check(TokenType.EOF)) {
      if (this.peek().type === TokenType.STRING) items.push(this.advance().value);
      this.match(TokenType.COMMA);
    }
    this.expect(TokenType.RBRACKET);
    return items;
  }

  private skipGenerics(): void {
    if (!this.check(TokenType.LANGLE)) return;
    this.advance();
    let depth = 1;
    while (depth > 0 && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.LANGLE)) depth++;
      else if (this.check(TokenType.RANGLE)) depth--;
      this.advance();
    }
  }
}
