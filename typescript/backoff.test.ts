import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeBackoffMs, BACKOFF_BASE_MS } from './backoff.js';

describe('immune backoff', () => {
  it('returns 0 when backoff is omitted', () => {
    assert.equal(computeBackoffMs(undefined, 1), 0);
  });

  it('computes linear backoff', () => {
    assert.equal(computeBackoffMs('linear', 1), BACKOFF_BASE_MS);
    assert.equal(computeBackoffMs('linear', 3), BACKOFF_BASE_MS * 3);
  });

  it('computes exponential backoff', () => {
    assert.equal(computeBackoffMs('exponential', 1), 100);
    assert.equal(computeBackoffMs('exponential', 2), 200);
    assert.equal(computeBackoffMs('exponential', 3), 400);
  });
});
