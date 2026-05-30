import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { compile } from './compile.js';
import { Lexer, TokenType } from './lexer.js';
import { Parser } from './parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const validatorSource = readFileSync(join(__dirname, '../examples/validator.cell'), 'utf-8');

describe('Cell Coding compiler smoke', () => {
  it('tokenizes generic and comparison angle brackets', () => {
    const tokens = new Lexer('List<String> a < b').tokenize();
    const types = tokens.map(t => t.type).filter(t => t !== 'EOF');
    assert.ok(types.includes(TokenType.IDENTIFIER));
    assert.equal(tokens.filter(t => t.value === '<').length, 2);
  });

  it('parses List and Map type expressions', () => {
    const src = [
      'signal RawInput { payload: String; }',
      'signal ValidSignal { value: String; }',
      'cell C {',
      '  role: "r";',
      '  membrane { accepts: RawInput; emits: ValidSignal; }',
      '  on(RawInput x) { emit ValidSignal; }',
      '  nucleus {',
      '    cache: Map<String, Bool>;',
      '    labels: List<String>;',
      '  }',
      '}',
    ].join(' ');
    const tokens = new Lexer(src).tokenize();
    const program = new Parser(tokens).parse();
    const cell = program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(cell && cell.kind === 'CellDecl');
    const nucleus = cell.body.nucleus;
    assert.ok(nucleus, 'nucleus expected');
    const cacheField = nucleus.fields.find(f => f.name === 'cache');
    assert.equal(cacheField?.typeExpr.kind, 'MapType');
    const tagsField = nucleus.fields.find(f => f.name === 'labels');
    assert.equal(tagsField?.typeExpr.kind, 'ListType');
  });

  it('compiles examples/validator.cell without errors', () => {
    const { program, diagnostics } = compile(validatorSource);
    assert.equal(program.statements.length, 4);
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('validates signal extends for membrane compatibility', () => {
    const src = `
signal ErrorSignal { message: String; }
signal DatabaseError extends ErrorSignal { code: Number; }
cell Emitter {
  role: "emit";
  membrane { accepts: RawInput; emits: DatabaseError; }
  on(RawInput x) { emit DatabaseError; }
}
cell Receiver {
  role: "recv";
  membrane { accepts: ErrorSignal; emits: ValidSignal; }
  on(DatabaseError err) { emit ValidSignal; }
}
signal RawInput { payload: String; }
signal ValidSignal { value: String; }
tissue Pipeline {
  flow linear { Emitter -> Receiver }
}
`;
    const { diagnostics } = compile(src);
    const overlapWarn = diagnostics.find(d =>
      d.message.includes('no signal overlap')
    );
    assert.equal(overlapWarn, undefined, overlapWarn?.message);
  });

  it('reports unknown signal extends', () => {
    const src = `
signal Orphan extends MissingParent { x: String; }
`;
    const { diagnostics } = compile(src);
    const err = diagnostics.find(d => d.kind === 'error' && d.message.includes('extends unknown'));
    assert.ok(err);
  });

  it('parses accepts query on membrane', () => {
    const src = `
signal FindUser { id: String; }
signal UserFound { name: String; }
cell Lookup {
  role: "lookup";
  membrane {
    accepts: FindUser query;
    emits: UserFound;
  }
  on(FindUser req) { emit UserFound; }
}
`;
    const { program, diagnostics } = compile(src);
    const cell = program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(cell && cell.kind === 'CellDecl');
    assert.equal(cell.body.membrane.acceptsIsQuery, true);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  });
});
