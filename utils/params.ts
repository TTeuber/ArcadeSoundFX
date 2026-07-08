import { SynthParams, WaveType, NoiseType } from '../types';
import { DEFAULT_PARAMS } from '../constants';

export const WAVE_TYPES: WaveType[] = ['square', 'sawtooth', 'triangle', 'sine'];
export const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown'];

type NumericKey = Exclude<keyof SynthParams, 'waveType' | 'noiseType'>;

// [min, max, decimals] — mirrors the slider ranges in App.tsx. Anything that
// sets params programmatically (URL, randomize, AI) is squeezed through this
// so the UI never shows out-of-range or float-noise values.
const NUMERIC_BOUNDS: Record<NumericKey, [number, number, number]> = {
  toneLevel: [0, 1, 2],
  frequency: [50, 2000, 0],
  noiseLevel: [0, 1, 2],
  ampAttack: [0.001, 1, 2],
  ampDecay: [0.01, 2, 2],
  pitchEnvAttack: [0.001, 1, 2],
  pitchEnvDecay: [0.01, 1, 2],
  pitchEnvAmount: [-4, 4, 1],
  vibratoDepth: [0, 1, 2],
  vibratoRate: [0.1, 20, 1],
};

export const NUMERIC_KEYS = Object.keys(NUMERIC_BOUNDS) as NumericKey[];

export function roundTo(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

export function clampParam(key: NumericKey, value: number): number {
  const [min, max, decimals] = NUMERIC_BOUNDS[key];
  if (!Number.isFinite(value)) return DEFAULT_PARAMS[key];
  return Math.min(max, Math.max(min, roundTo(value, decimals)));
}

// Turns untrusted partial input (URL hash, AI response) into a valid
// SynthParams, falling back to defaults field by field.
export function sanitizeParams(input: Record<string, unknown>): SynthParams {
  const out: SynthParams = { ...DEFAULT_PARAMS };

  if (WAVE_TYPES.includes(input.waveType as WaveType)) {
    out.waveType = input.waveType as WaveType;
  }
  if (NOISE_TYPES.includes(input.noiseType as NoiseType)) {
    out.noiseType = input.noiseType as NoiseType;
  }
  for (const key of NUMERIC_KEYS) {
    const raw = input[key];
    const num = typeof raw === 'string' ? parseFloat(raw) : (raw as number);
    if (typeof num === 'number' && Number.isFinite(num)) {
      out[key] = clampParam(key, num);
    }
  }
  return out;
}
