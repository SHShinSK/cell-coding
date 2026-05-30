// ═══════════════════════════════════════════════════════════
//  Cell Coding — Lexer
//  Tokenizes .cell source into a token stream.
//  .cell 소스를 토큰 스트림으로 변환한다.
// ═══════════════════════════════════════════════════════════

export enum TokenType {
  // Keywords · 키워드
  CELL       = 'cell',
  SIGNAL     = 'signal',
  MEMBRANE   = 'membrane',
  TISSUE     = 'tissue',
  ORGAN      = 'organ',
  ORGANISM   = 'organism',
  GENOME     = 'genome',
  NERVOUS    = 'nervous',
  IMMUNE     = 'immune',
  ON         = 'on',
  EMIT       = 'emit',
  ABSORB     = 'absorb',
  DIVIDE     = 'divide',
  MUTATE     = 'mutate',
  APOPTOSIS  = 'apoptosis',
  NUCLEUS    = 'nucleus',
  ROLE       = 'role',
  TAGS       = 'tags',
  LIFESPAN   = 'lifespan',
  ACCEPTS    = 'accepts',
  EMITS      = 'emits',
  REJECTS    = 'rejects',
  OBSERVES   = 'observes',
  EXPORTS    = 'exports',
  FLOW       = 'flow',
  SHARED     = 'shared',
  FROM       = 'from',
  WITH       = 'with',
  EXTENDS    = 'extends',
  WHEN       = 'when',
  PRIORITY   = 'priority',
  QUERY      = 'query',
  LET        = 'let',
  IF         = 'if',
  ELSE       = 'else',
  RETURN     = 'return',

  // Literals · 리터럴
  IDENTIFIER = 'IDENTIFIER',
  STRING     = 'STRING',
  NUMBER     = 'NUMBER',
  BOOLEAN    = 'BOOLEAN',

  // Delimiters · 구분자
  LBRACE     = '{',
  RBRACE     = '}',
  LPAREN     = '(',
  RPAREN     = ')',
  LBRACKET   = '[',
  RBRACKET   = ']',
  LANGLE     = '<',
  RANGLE     = '>',
  COLON      = ':',
  SEMICOLON  = ';',
  COMMA      = ',',
  DOT        = '.',
  PIPE       = '|',
  ARROW      = '→',
  ARROW_ASCII= '->',
  AMP        = '&',
  QUESTION   = '?',

  // Operators · 연산자
  ASSIGN     = '=',
  EQ         = '==',
  NEQ        = '!=',
  // Comparison `<` `>` use LANGLE/RANGLE (value '<' '>') and are
  // resolved in parseBinary() by context (same lexeme as generics).
  // 비교 `<` `>` 는 LANGLE/RANGLE 로 생성되며 parseBinary() 가 문맥으로 처리한다.
  LTE        = '<=',
  GTE        = '>=',
  AND        = '&&',
  OR         = '||',
  BANG       = '!',

  EOF        = 'EOF',
  COMMENT    = 'COMMENT',
}

const KEYWORDS: Record<string, TokenType> = {
  cell:       TokenType.CELL,
  signal:     TokenType.SIGNAL,
  membrane:   TokenType.MEMBRANE,
  tissue:     TokenType.TISSUE,
  organ:      TokenType.ORGAN,
  organism:   TokenType.ORGANISM,
  genome:     TokenType.GENOME,
  nervous:    TokenType.NERVOUS,
  immune:     TokenType.IMMUNE,
  on:         TokenType.ON,
  emit:       TokenType.EMIT,
  absorb:     TokenType.ABSORB,
  divide:     TokenType.DIVIDE,
  mutate:     TokenType.MUTATE,
  apoptosis:  TokenType.APOPTOSIS,
  nucleus:    TokenType.NUCLEUS,
  role:       TokenType.ROLE,
  tags:       TokenType.TAGS,
  lifespan:   TokenType.LIFESPAN,
  accepts:    TokenType.ACCEPTS,
  emits:      TokenType.EMITS,
  rejects:    TokenType.REJECTS,
  observes:   TokenType.OBSERVES,
  exports:    TokenType.EXPORTS,
  flow:       TokenType.FLOW,
  shared:     TokenType.SHARED,
  from:       TokenType.FROM,
  with:       TokenType.WITH,
  extends:    TokenType.EXTENDS,
  when:       TokenType.WHEN,
  priority:   TokenType.PRIORITY,
  query:      TokenType.QUERY,
  let:        TokenType.LET,
  if:         TokenType.IF,
  else:       TokenType.ELSE,
  return:     TokenType.RETURN,
  true:       TokenType.BOOLEAN,
  false:      TokenType.BOOLEAN,
};

export interface Token {
  type:   TokenType;
  value:  string;
  line:   number;
  col:    number;
}

export class LexError extends Error {
  constructor(msg: string, public line: number, public col: number) {
    super(`[Lex Error] ${msg} at ${line}:${col}`);
  }
}

export class Lexer {
  private pos  = 0;
  private line = 1;
  private col  = 1;
  private tokens: Token[] = [];

  constructor(private src: string) {}

  tokenize(): Token[] {
    while (this.pos < this.src.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.src.length) break;
      this.readToken();
    }
    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, col: this.col });
    return this.tokens;
  }

  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? '';
  }

  private advance(): string {
    const ch = this.src[this.pos++];
    if (ch === '\n') { this.line++; this.col = 1; }
    else             { this.col++; }
    return ch;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.src.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.advance();
      } else if (ch === '/' && this.peek(1) === '/') {
        while (this.pos < this.src.length && this.peek() !== '\n') this.advance();
      } else if (ch === '/' && this.peek(1) === '*') {
        this.advance(); this.advance();
        while (this.pos < this.src.length) {
          if (this.peek() === '*' && this.peek(1) === '/') { this.advance(); this.advance(); break; }
          this.advance();
        }
      } else break;
    }
  }

  private readToken(): void {
    const line = this.line;
    const col  = this.col;
    const ch   = this.peek();

    // Unicode arrow
    if (ch === '→') { this.advance(); this.push(TokenType.ARROW, '→', line, col); return; }

    // ASCII arrow
    if (ch === '-' && this.peek(1) === '>') {
      this.advance(); this.advance(); this.push(TokenType.ARROW_ASCII, '->', line, col); return;
    }

    // Two-char operators
    const two = ch + this.peek(1);
    const twoMap: Record<string, TokenType> = {
      '==': TokenType.EQ, '!=': TokenType.NEQ,
      '<=': TokenType.LTE, '>=': TokenType.GTE,
      '&&': TokenType.AND, '||': TokenType.OR,
    };
    if (twoMap[two]) {
      this.advance(); this.advance(); this.push(twoMap[two], two, line, col); return;
    }

    // Single-char
    const singleMap: Record<string, TokenType> = {
      '{': TokenType.LBRACE, '}': TokenType.RBRACE,
      '(': TokenType.LPAREN, ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,']': TokenType.RBRACKET,
      ':': TokenType.COLON,  ';': TokenType.SEMICOLON,
      ',': TokenType.COMMA,  '.': TokenType.DOT,
      '|': TokenType.PIPE,   '&': TokenType.AMP,
      '=': TokenType.ASSIGN, '?': TokenType.QUESTION,
      '!': TokenType.BANG,
      '<': TokenType.LANGLE, '>': TokenType.RANGLE,
    };
    if (singleMap[ch]) { this.advance(); this.push(singleMap[ch], ch, line, col); return; }

    // String
    if (ch === '"' || ch === "'") { this.readString(line, col); return; }

    // Number
    if (this.isDigit(ch)) { this.readNumber(line, col); return; }

    // Identifier / keyword
    if (this.isAlpha(ch)) { this.readIdentifier(line, col); return; }

    throw new LexError(`Unexpected character '${ch}'`, line, col);
  }

  private readString(line: number, col: number): void {
    const quote = this.advance();
    let value = '';
    while (this.pos < this.src.length && this.peek() !== quote) {
      if (this.peek() === '\\') { this.advance(); value += this.advance(); }
      else value += this.advance();
    }
    if (this.pos >= this.src.length) throw new LexError('Unterminated string', line, col);
    this.advance(); // closing quote
    this.push(TokenType.STRING, value, line, col);
  }

  private readNumber(line: number, col: number): void {
    let value = '';
    while (this.isDigit(this.peek()) || this.peek() === '.') value += this.advance();
    this.push(TokenType.NUMBER, value, line, col);
  }

  private readIdentifier(line: number, col: number): void {
    let value = '';
    while (this.isAlphaNum(this.peek()) || this.peek() === '_') value += this.advance();
    const type = KEYWORDS[value] ?? TokenType.IDENTIFIER;
    this.push(type, value, line, col);
  }

  private push(type: TokenType, value: string, line: number, col: number): void {
    this.tokens.push({ type, value, line, col });
  }

  private isDigit(ch: string)    { return ch >= '0' && ch <= '9'; }
  private isAlpha(ch: string)    { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'; }
  private isAlphaNum(ch: string) { return this.isAlpha(ch) || this.isDigit(ch); }
}
