import { describe, it, expect } from 'vitest';
import { createBudget, allocate, estimateTokens } from '../src/index';

describe('estimateTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('hello world')).toBe(3);
  });
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('allocate', () => {
  it('includes all layers when under budget', () => {
    const budget = createBudget(1000, [
      { name: 'system', priority: 1, required: true },
      { name: 'context', priority: 2 },
      { name: 'history', priority: 3 },
    ]);
    const result = allocate(budget, {
      system: 'You are helpful.',
      context: 'Some context.',
      history: 'Prior chat.',
    });
    expect(result.included).toContain('system');
    expect(result.included).toContain('context');
    expect(result.included).toContain('history');
    expect(result.dropped).toHaveLength(0);
  });

  it('drops lowest priority first when over budget', () => {
    const budget = createBudget(20, [
      { name: 'system', priority: 1, required: true },
      { name: 'context', priority: 2 },
      { name: 'history', priority: 3 },
    ]);
    const result = allocate(budget, {
      system: 'System prompt that uses many tokens in this sentence.',
      context: 'Important context data.',
      history: 'Old chat history.',
    });
    expect(result.included).toContain('system');
    expect(result.dropped.length).toBeGreaterThan(0);
  });

  it('never drops required layers', () => {
    const budget = createBudget(5, [
      { name: 'system', priority: 1, required: true },
      { name: 'extras', priority: 2 },
    ]);
    const result = allocate(budget, {
      system: 'A required system prompt that is quite long.',
      extras: 'Optional extras.',
    });
    expect(result.included).toContain('system');
    expect(result.dropped).toContain('extras');
  });

  it('handles empty content', () => {
    const budget = createBudget(1000, [
      { name: 'system', priority: 1, required: true },
    ]);
    const result = allocate(budget, { system: '' });
    expect(result.included).toContain('system');
    expect(result.totalTokens).toBe(0);
  });

  it('provides trace with token estimates', () => {
    const budget = createBudget(500, [
      { name: 'a', priority: 1 },
      { name: 'b', priority: 2 },
    ]);
    const result = allocate(budget, { a: 'hello', b: 'world' });
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(typeof result.budgetLimit).toBe('number');
  });

  it('supports custom token estimator', () => {
    const budget = createBudget(10, [
      { name: 'a', priority: 1 },
    ], { estimator: (text) => text.length });
    const result = allocate(budget, { a: 'hello world' }); // 11 > 10
    expect(result.dropped).toContain('a');
  });
});
