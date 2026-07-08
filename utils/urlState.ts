import { SynthParams } from '../types';
import { sanitizeParams } from './params';

// Short URL keys keep shared links compact:
// #wv=square&fq=990&tl=0.7&ad=0.45&pm=0.4...
const KEY_MAP: [string, keyof SynthParams][] = [
  ['wv', 'waveType'],
  ['tl', 'toneLevel'],
  ['fq', 'frequency'],
  ['nt', 'noiseType'],
  ['nl', 'noiseLevel'],
  ['aa', 'ampAttack'],
  ['ad', 'ampDecay'],
  ['pa', 'pitchEnvAttack'],
  ['pd', 'pitchEnvDecay'],
  ['pm', 'pitchEnvAmount'],
  ['vd', 'vibratoDepth'],
  ['vr', 'vibratoRate'],
];

export function encodeParamsToHash(params: SynthParams): string {
  const search = new URLSearchParams();
  for (const [short, key] of KEY_MAP) {
    search.set(short, String(params[key]));
  }
  return search.toString();
}

export function decodeParamsFromHash(hash: string): SynthParams | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const search = new URLSearchParams(raw);
  const input: Record<string, unknown> = {};
  let found = false;
  for (const [short, key] of KEY_MAP) {
    const value = search.get(short);
    if (value !== null) {
      input[key] = value;
      found = true;
    }
  }
  return found ? sanitizeParams(input) : null;
}
