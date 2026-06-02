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
const spongeSource = readFileSync(join(__dirname, '../examples/porifera-filter/sponge-organism.cell'), 'utf-8');
const spiderlingSource = readFileSync(join(__dirname, '../examples/spiderling/spiderling-organism.cell'), 'utf-8');
const spiderlingSimSource = readFileSync(join(__dirname, '../examples/spiderling-sim/spiderling-sim-organism.cell'), 'utf-8');
const spiderSimSource = readFileSync(join(__dirname, '../examples/spider-robot-sim/spider-sim-organism.cell'), 'utf-8');
const roboticsBaseSignals = readFileSync(join(__dirname, '../registry/signals/robotics/base.cell'), 'utf-8');
const spiderSource = readFileSync(join(__dirname, '../examples/spider-robot/spider-organism.cell'), 'utf-8');
const petSource = readFileSync(join(__dirname, '../examples/pet-robot/pet-organism.cell'), 'utf-8');
const petSimSource = readFileSync(join(__dirname, '../examples/pet-robot-sim/pet-sim-organism.cell'), 'utf-8');
const humanoidSource = readFileSync(join(__dirname, '../examples/humanoid-robot/humanoid-organism.cell'), 'utf-8');

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

  it('compiles examples/porifera-filter/sponge-organism.cell without errors', () => {
    const { program, diagnostics } = compile(spongeSource);
    assert.ok(program.statements.length >= 10);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.organs.length, 1);
    assert.equal(organism.organs[0], 'SpongeBody');
    assert.ok(organism.immune);
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles examples/spiderling/spiderling-organism.cell without errors', () => {
    const { program, diagnostics } = compile(spiderlingSource);
    assert.ok(program.statements.length >= 14);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 5);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.organs[0], 'SpiderThorax');
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles examples/spiderling-sim/spiderling-sim-organism.cell without errors', () => {
    const { program, diagnostics } = compile(spiderlingSimSource);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 6);
    const gate = cells.find(c => c.kind === 'CellDecl' && c.name === 'ImuStreamGateCell');
    assert.ok(gate);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.organs[0], 'SpiderThoraxSim');
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles registry/signals/robotics/base.cell without errors', () => {
    const { program, diagnostics } = compile(roboticsBaseSignals);
    const signals = program.statements.filter(s => s.kind === 'SignalDecl');
    assert.equal(signals.length, 7);
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('parses stream declarations and membrane physical SLA (RFC-0001)', () => {
    const src = [
      'signal ImuSample { timestamp: Number; accelZ: Number; }',
      'stream ImuStream { rate: 100Hz; sample: ImuSample; }',
      'cell Gate {',
      '  role: "gate";',
      '  membrane { accepts: ImuSample; emits: ImuSample; latency: budget 10ms; rate: max 100Hz; onViolation: holdLastSafe; }',
      '  onSample(ImuSample s) { emit ImuSample; }',
      '}',
    ].join(' ');
    const { program, diagnostics } = compile(src);
    const stream = program.statements.find(s => s.kind === 'StreamDecl');
    assert.ok(stream && stream.kind === 'StreamDecl');
    assert.equal(stream.name, 'ImuStream');
    assert.equal(stream.rateHz, 100);
    assert.equal(stream.sampleType, 'ImuSample');
    const cell = program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(cell && cell.kind === 'CellDecl');
    assert.equal(cell.body.handlers[0]?.isSample, true);
    assert.equal(cell.body.membrane.physicalSla?.latencyBudgetMs, 10);
    assert.equal(cell.body.membrane.physicalSla?.rateMaxHz, 100);
    assert.equal(cell.body.membrane.physicalSla?.onViolation, 'holdLastSafe');
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
    const slaWarnings = diagnostics.filter(d => d.kind === 'warning' && d.message.includes('physical SLA'));
    assert.ok(slaWarnings.length >= 1);
  });

  it('warns when stream rate and membrane rate max diverge (RFC-0001 SSOT)', () => {
    const src = [
      'signal S { v: Number; }',
      'stream BadStream { rate: 30Hz; sample: S; }',
      'cell C { role: "r";',
      '  membrane { accepts: S; emits: S; rate: max 100Hz; }',
      '  onSample(S s) { emit S; }',
      '}',
    ].join(' ');
    const { diagnostics } = compile(src);
    assert.ok(
      diagnostics.some(d => d.kind === 'warning' && d.message.includes('30Hz') && d.message.includes('100Hz')),
    );
  });

  it('compiles examples/spider-robot-sim/spider-sim-organism.cell without errors', () => {
    const { program, diagnostics } = compile(spiderSimSource);
    const streams = program.statements.filter(s => s.kind === 'StreamDecl');
    assert.equal(streams.length, 2);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 10);
    const vision = cells.find(c => c.kind === 'CellDecl' && c.name === 'VisionSenseCell');
    assert.ok(vision && vision.kind === 'CellDecl');
    assert.equal(vision.body.handlers[0]?.isSample, true);
    assert.ok(vision.body.membrane.physicalSla);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.name, 'SpiderSimOrganism');
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles examples/spider-robot/spider-organism.cell without errors', () => {
    const { program, diagnostics } = compile(spiderSource);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 10);
    const organs = program.statements.filter(s => s.kind === 'OrganDecl');
    assert.equal(organs.length, 3);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.organs.length, 3);
    assert.ok(organism.nervous);
    assert.equal(organism.nervous!.routes.length, 2);
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles examples/pet-robot/pet-organism.cell without errors', () => {
    const { program, diagnostics } = compile(petSource);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 11);
    const organs = program.statements.filter(s => s.kind === 'OrganDecl');
    assert.equal(organs.length, 3);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.nervous!.routes.length, 3);
    assert.ok(organism.immune);
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles examples/pet-robot-sim/pet-sim-organism.cell without errors', () => {
    const { program, diagnostics } = compile(petSimSource);
    const streams = program.statements.filter(s => s.kind === 'StreamDecl');
    assert.equal(streams.length, 2);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 11);
    const presence = cells.find(c => c.kind === 'CellDecl' && c.name === 'PresenceSenseCell');
    assert.ok(presence && presence.kind === 'CellDecl');
    assert.equal(presence.body.handlers[0]?.isSample, true);
    assert.ok(presence.body.membrane.physicalSla);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.name, 'PetSimOrganism');
    const errors = diagnostics.filter(d => d.kind === 'error');
    assert.equal(errors.length, 0, errors.map(e => e.message).join('; '));
  });

  it('compiles examples/humanoid-robot/humanoid-organism.cell without errors', () => {
    const { program, diagnostics } = compile(humanoidSource);
    const cells = program.statements.filter(s => s.kind === 'CellDecl');
    assert.equal(cells.length, 14);
    const organs = program.statements.filter(s => s.kind === 'OrganDecl');
    assert.equal(organs.length, 4);
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.organs.length, 4);
    assert.equal(organism.nervous!.routes.length, 4);
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

  it('parses generic types with three or more type arguments', () => {
    const src = [
      'signal RawInput { payload: String; }',
      'signal ValidSignal { value: String; }',
      'cell C {',
      '  role: "r";',
      '  membrane { accepts: RawInput; emits: ValidSignal; }',
      '  on(RawInput x) { emit ValidSignal; }',
      '  nucleus {',
      '    triple: Foo<A, B, C>;',
      '  }',
      '}',
    ].join(' ');
    const program = new Parser(new Lexer(src).tokenize()).parse();
    const cell = program.statements.find(s => s.kind === 'CellDecl');
    assert.ok(cell && cell.kind === 'CellDecl');
    const tripleField = cell.body.nucleus?.fields.find(f => f.name === 'triple');
    assert.equal(tripleField?.typeExpr.kind, 'GenericType');
    if (tripleField?.typeExpr.kind === 'GenericType') {
      assert.equal(tripleField.typeExpr.name, 'Foo');
      assert.equal(tripleField.typeExpr.params.length, 3);
    }
  });

  it('compiles examples/motion-alarm/motion-alarm.cell without errors', () => {
    const source = readFileSync(join(__dirname, '../examples/motion-alarm/motion-alarm.cell'), 'utf-8');
    const { diagnostics } = compile(source);
    assert.equal(diagnostics.filter(d => d.kind === 'error').length, 0);
  });

  it('parses circuit breaker window into windowSecs', () => {
    const src = `
signal RawInput { payload: String; }
signal ValidSignal { value: String; }
cell Dummy {
  role: "dummy";
  membrane { accepts: RawInput; emits: ValidSignal; }
  on(RawInput x) { emit ValidSignal; }
}
organ DummyOrgan {
  tissues { DummyTissue }
}
tissue DummyTissue {
  flow linear { Dummy }
}
organism App {
  organs { DummyOrgan }
  immune ErrorPolicy {
    circuit {
      threshold: 10;
      window: 120;
      open: 45;
    }
  }
}
`;
    const program = new Parser(new Lexer(src).tokenize()).parse();
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    assert.equal(organism.immune?.circuit?.windowSecs, 120);
    assert.equal(organism.immune?.circuit?.threshold, 10);
    assert.equal(organism.immune?.circuit?.openSecs, 45);
  });

  it('parses immune policy backoff, fallback, and escalate fields', () => {
    const src = `
signal RawInput { payload: String; }
signal ValidSignal { value: String; }
signal DatabaseError { message: String; }
cell Dummy {
  role: "dummy";
  membrane { accepts: RawInput; emits: ValidSignal; }
  on(RawInput x) { emit ValidSignal; }
}
organ DummyOrgan {
  tissues { DummyTissue }
}
tissue DummyTissue {
  flow linear { Dummy }
}
organism App {
  organs { DummyOrgan }
  immune ErrorPolicy {
    on DatabaseError {
      strategy: fallback;
      retries: 2;
      backoff: exponential;
      fallback: NullSignal;
      escalate: true;
    }
  }
}
`;
    const program = new Parser(new Lexer(src).tokenize()).parse();
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    const policy = organism.immune?.policies[0];
    assert.ok(policy);
    assert.equal(policy.errorType, 'DatabaseError');
    assert.equal(policy.strategy, 'fallback');
    assert.equal(policy.retries, 2);
    assert.equal(policy.backoff, 'exponential');
    assert.equal(policy.fallback, 'NullSignal');
    assert.equal(policy.escalate, true);
  });

  it('parses nervous when and transform routes', () => {
    const src = readFileSync(join(__dirname, 'fixtures/conditional-organs.cell'), 'utf-8');
    const program = new Parser(new Lexer(src).tokenize()).parse();
    const organism = program.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(organism && organism.kind === 'OrganismDecl');
    const whenRoute = organism.nervous?.routes.find(r => r.branchKind === 'when');
    assert.ok(whenRoute);
    assert.equal(whenRoute.targets[0], 'OrganB');
    assert.ok(whenRoute.condition);

    const transformSrc = readFileSync(join(__dirname, 'fixtures/transform-organs.cell'), 'utf-8');
    const transformProgram = new Parser(new Lexer(transformSrc).tokenize()).parse();
    const transformOrganism = transformProgram.statements.find(s => s.kind === 'OrganismDecl');
    assert.ok(transformOrganism && transformOrganism.kind === 'OrganismDecl');
    const transformRoute = transformOrganism.nervous?.routes[0];
    assert.ok(transformRoute?.transform);
    assert.equal(transformRoute.transform?.signalType, 'RoutedPing');
  });

  it('tokenizes hyphenated divide strategies', () => {
    const tokens = new Lexer('strategy: round-robin strategy: least-loaded').tokenize();
    const values = tokens.map(t => t.value);
    assert.ok(values.includes('round-robin'));
    assert.ok(values.includes('least-loaded'));
  });

  it('parses divide round-robin and least-loaded strategies', () => {
    const src = `
cell W1 {
  role: "w";
  membrane { accepts: Task; emits: Done; }
  divide when (queue.depth > 5) { max: 3 strategy: round-robin }
  on(Task t) { emit Done; }
}
cell W2 {
  role: "w";
  membrane { accepts: Task; emits: Done; }
  divide when (queue.depth > 5) { max: 2 strategy: least-loaded }
  on(Task t) { emit Done; }
}
signal Task { id: String; }
signal Done { id: String; }
`;
    const program = new Parser(new Lexer(src).tokenize()).parse();
    const w1 = program.statements.find(s => s.kind === 'CellDecl' && s.name === 'W1');
    const w2 = program.statements.find(s => s.kind === 'CellDecl' && s.name === 'W2');
    assert.ok(w1 && w1.kind === 'CellDecl');
    assert.ok(w2 && w2.kind === 'CellDecl');
    assert.equal(w1.body.divide?.strategy, 'round-robin');
    assert.equal(w2.body.divide?.strategy, 'least-loaded');
  });
});
