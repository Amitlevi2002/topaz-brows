import { describe, expect, test } from 'vitest';
import { DEFAULT_CATALOG, cleanExtras, extrasLabel, priceOf } from './catalog';

// The combinations on Topaz's own price list, worked out from a treatment and its extras.
describe('the price a client sees while booking', () => {
  test('matches the price list Topaz gave', () => {
    expect(priceOf('design', {})?.total).toBe(60);
    expect(priceOf('lift', {})?.total).toBe(180);
    expect(priceOf('design', { lip: 1 })?.total).toBe(70);
    expect(priceOf('design', { lip: 1, nose: 1 })?.total).toBe(75);
    expect(priceOf('lift', { lip: 1 })?.total).toBe(190);
  });

  test('extras are flat: picked once, never counted twice', () => {
    expect(cleanExtras({ lip: 4, tint: 1, made_up: 2 })).toEqual({ lip: 1, tint: 1 });
    expect(DEFAULT_CATALOG.extras.every((e) => !e.perNail)).toBe(true);
  });

  test('the summary names the extras without counts', () => {
    expect(extrasLabel({ lip: 1, nose: 1 })).toBe('שפם · אף');
  });
});
