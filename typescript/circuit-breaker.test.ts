import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreakerManager } from './circuit-breaker.js';

const config = {
  kind: 'CircuitBreakerDecl' as const,
  pos: { line: 1, column: 1, offset: 0 },
  threshold: 2,
  windowSecs: 60,
  openSecs: 5,
  probes: 1,
};

describe('CircuitBreakerManager', () => {
  it('trips after threshold faults in the window', () => {
    const cb = new CircuitBreakerManager(config);
    assert.equal(cb.recordFault(0), false);
    assert.equal(cb.getPhase(0), 'closed');
    assert.equal(cb.recordFault(100), true);
    assert.equal(cb.getPhase(100), 'open');
    assert.equal(cb.blocksImmuneAction(100), true);
  });

  it('transitions open → halfOpen → closed after probe', () => {
    const cb = new CircuitBreakerManager(config);
    cb.recordFault(0);
    cb.recordFault(1);
    assert.equal(cb.getPhase(1), 'open');
    assert.equal(cb.getPhase(5001), 'halfOpen');
    assert.equal(cb.blocksImmuneAction(5001), false);
    assert.equal(cb.getPhase(5001), 'closed');
  });
});
