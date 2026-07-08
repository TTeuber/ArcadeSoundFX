import { describe, it, expect } from 'vitest';
import { sanitizeParams, clampParam } from './params';
import { DEFAULT_PARAMS, PRESETS } from '../constants';

describe('sanitizeParams', () => {
  it('clamps out-of-range numbers to the slider bounds', () => {
    const result = sanitizeParams({ pitchEnvDecay: 2.0, frequency: 9999, toneLevel: -1 });
    expect(result.pitchEnvDecay).toBe(1.0);
    expect(result.frequency).toBe(2000);
    expect(result.toneLevel).toBe(0);
  });

  it('falls back to defaults for garbage input', () => {
    const result = sanitizeParams({
      waveType: 'laser',
      noiseType: 42,
      frequency: 'loud',
      ampDecay: NaN,
    });
    expect(result).toEqual(DEFAULT_PARAMS);
  });

  it('rounds float noise to the display precision', () => {
    expect(sanitizeParams({ toneLevel: 0.30000000000000004 }).toneLevel).toBe(0.3);
    expect(clampParam('frequency', 747.9000001)).toBe(748);
  });
});

describe('presets', () => {
  // A preset value outside the slider ranges renders a broken UI (fill bar
  // painting past the track), so every preset must survive sanitization
  // unchanged.
  for (const [name, preset] of Object.entries(PRESETS)) {
    it(`${name} stays within slider bounds`, () => {
      const merged = { ...DEFAULT_PARAMS, ...preset };
      expect(sanitizeParams(merged)).toEqual(merged);
    });
  }
});
