import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeNextStack, MAX_STACK_SIZE } from '../context/NavigationContext';

describe('NavigationContext - Route Stack Logic', () => {
  test('ignores null or undefined pathnames without modifying stack', () => {
    const initial = ['/'];
    assert.deepEqual(computeNextStack(initial, null), ['/']);
    assert.deepEqual(computeNextStack(initial, undefined), ['/']);
    assert.deepEqual(computeNextStack(initial, ''), ['/']);
  });

  test('pushes new routes onto stack', () => {
    let stack = ['/'];
    stack = computeNextStack(stack, '/cart');
    assert.deepEqual(stack, ['/', '/cart']);

    stack = computeNextStack(stack, '/orders/ord_123');
    assert.deepEqual(stack, ['/', '/cart', '/orders/ord_123']);
  });

  test('dedupes consecutive identical routes (e.g. re-renders on same route)', () => {
    const stack = ['/', '/cart'];
    const next = computeNextStack(stack, '/cart');
    assert.deepEqual(next, ['/', '/cart']);
    assert.equal(next.length, 2);
  });

  test('detects browser back navigation (popping top when returning to second-to-last item)', () => {
    const stack = ['/', '/cart', '/orders'];
    const popped = computeNextStack(stack, '/cart');
    assert.deepEqual(popped, ['/', '/cart']);
  });

  test('caps stack at MAX_STACK_SIZE (15 entries) and drops oldest entries', () => {
    let stack: string[] = [];
    for (let i = 1; i <= 25; i++) {
      stack = computeNextStack(stack, `/route-${i}`);
    }

    assert.equal(stack.length, MAX_STACK_SIZE);
    assert.equal(MAX_STACK_SIZE, 15);
    // Oldest should have dropped off; stack should contain route-11 to route-25
    assert.equal(stack[0], '/route-11');
    assert.equal(stack[stack.length - 1], '/route-25');
  });

  test('honors custom maxCap limit', () => {
    let stack = ['/a', '/b', '/c'];
    stack = computeNextStack(stack, '/d', 3);
    assert.deepEqual(stack, ['/b', '/c', '/d']);
  });
});
