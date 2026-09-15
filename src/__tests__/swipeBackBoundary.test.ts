import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { isSwipeBackExcluded } from '../hooks/useSwipeBack';

/**
 * Creates a lightweight mock DOM Element for boundary testing.
 */
function createMockElement(attributes: Record<string, string> = {}, classList: string[] = [], parent?: unknown) {
  const el = {
    attributes,
    classList,
    parent,
    closest(selectorStr: string) {
      const selectors = selectorStr.split(',').map((s) => s.trim());
      // Check current element
      for (const sel of selectors) {
        if (sel === '[data-no-swipe-back="true"]' && attributes['data-no-swipe-back'] === 'true') {
          return el;
        }
        if (sel === '[data-transform-wrapper]' && 'data-transform-wrapper' in attributes) {
          return el;
        }
        if (sel.startsWith('.') && classList.includes(sel.slice(1))) {
          return el;
        }
      }
      // Bubble up to parent if available
      if (parent && typeof (parent as { closest?: unknown }).closest === 'function') {
        return (parent as { closest: (s: string) => unknown }).closest(selectorStr);
      }
      return null;
    },
  };
  return el as unknown as EventTarget;
}

describe('useSwipeBack - Boundary Exclusion Logic', () => {
  test('returns false for null or undefined targets', () => {
    assert.equal(isSwipeBackExcluded(null), false);
    assert.equal(isSwipeBackExcluded(undefined as unknown as EventTarget), false);
  });

  test('returns false for targets without closest method', () => {
    assert.equal(isSwipeBackExcluded({} as EventTarget), false);
  });

  test('returns false for standard page elements outside excluded containers', () => {
    const regularCard = createMockElement({}, ['tactile-card', 'p-4']);
    assert.equal(isSwipeBackExcluded(regularCard), false);
  });

  test('excludes elements with explicit data-no-swipe-back="true" attribute', () => {
    const optOutElement = createMockElement({ 'data-no-swipe-back': 'true' });
    assert.equal(isSwipeBackExcluded(optOutElement), true);
  });

  test('excludes child elements nested inside data-no-swipe-back="true" container', () => {
    const parentContainer = createMockElement({ 'data-no-swipe-back': 'true' });
    const childDesk = createMockElement({}, ['seat-marker'], parentContainer);
    assert.equal(isSwipeBackExcluded(childDesk), true);
  });

  test('excludes elements inside react-transform-component container', () => {
    const mapWrapper = createMockElement({}, ['react-transform-component']);
    const svgMap = createMockElement({}, ['office-svg'], mapWrapper);
    assert.equal(isSwipeBackExcluded(svgMap), true);
  });

  test('excludes elements inside react-transform-wrapper container', () => {
    const outerWrapper = createMockElement({}, ['react-transform-wrapper']);
    const childElement = createMockElement({}, [], outerWrapper);
    assert.equal(isSwipeBackExcluded(childElement), true);
  });

  test('excludes elements with data-transform-wrapper defensive fallback', () => {
    const wrapper = createMockElement({ 'data-transform-wrapper': 'true' });
    const child = createMockElement({}, [], wrapper);
    assert.equal(isSwipeBackExcluded(child), true);
  });
});
