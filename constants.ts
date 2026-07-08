import { SynthParams } from './types';

export const DEFAULT_PARAMS: SynthParams = {
  waveType: 'square',
  toneLevel: 0.8,
  frequency: 440,
  noiseType: 'white',
  noiseLevel: 0.0,
  ampAttack: 0.01,
  ampDecay: 0.3,
  pitchEnvAttack: 0.01,
  pitchEnvDecay: 0.2,
  pitchEnvAmount: 0,
  vibratoDepth: 0,
  vibratoRate: 5,
};

// Each preset merges over DEFAULT_PARAMS. The pitch envelope sweeps
// base -> peak over its attack, then back to base over its decay, so a
// "hold at the higher note" effect uses a decay much longer than the amp
// decay (the return leg happens after the sound is already silent).
export const PRESETS: Record<string, Partial<SynthParams>> = {
  Coin: {
    // Two-tone chime: B5-ish base jumping up a fourth and holding there
    waveType: 'square',
    toneLevel: 0.7,
    frequency: 990,
    ampAttack: 0.01,
    ampDecay: 0.45,
    pitchEnvAttack: 0.07,
    pitchEnvDecay: 1.0,
    pitchEnvAmount: 0.4,
  },
  Laser: {
    // Bright zap falling fast through two and a half octaves
    waveType: 'sawtooth',
    toneLevel: 0.8,
    frequency: 1400,
    ampAttack: 0.01,
    ampDecay: 0.25,
    pitchEnvAttack: 0.01,
    pitchEnvDecay: 0.22,
    pitchEnvAmount: -2.5,
  },
  Explosion: {
    // Brown-noise boom with a low rumble underneath, slowly sagging in pitch
    waveType: 'sawtooth',
    toneLevel: 0.15,
    frequency: 80,
    noiseType: 'brown',
    noiseLevel: 1.0,
    ampAttack: 0.01,
    ampDecay: 1.4,
    pitchEnvAttack: 0.01,
    pitchEnvDecay: 0.6,
    pitchEnvAmount: -1,
  },
  Jump: {
    // Quick upward swoop from a low square
    waveType: 'square',
    toneLevel: 0.8,
    frequency: 160,
    ampAttack: 0.01,
    ampDecay: 0.3,
    pitchEnvAttack: 0.12,
    pitchEnvDecay: 0.15,
    pitchEnvAmount: 1.3,
  },
  Powerup: {
    // Long rising sweep with a fast warble on top
    waveType: 'square',
    toneLevel: 0.75,
    frequency: 330,
    ampAttack: 0.02,
    ampDecay: 0.6,
    pitchEnvAttack: 0.35,
    pitchEnvDecay: 0.3,
    pitchEnvAmount: 2,
    vibratoDepth: 0.15,
    vibratoRate: 14,
  },
  Hit: {
    // Short crunchy thud: falling square plus a burst of white noise
    waveType: 'square',
    toneLevel: 0.7,
    frequency: 220,
    noiseType: 'white',
    noiseLevel: 0.6,
    ampAttack: 0.01,
    ampDecay: 0.15,
    pitchEnvAttack: 0.01,
    pitchEnvDecay: 0.12,
    pitchEnvAmount: -1.8,
  },
  Blip: {
    // Tiny UI tick for menus and cursors
    waveType: 'square',
    toneLevel: 0.7,
    frequency: 1050,
    ampAttack: 0.01,
    ampDecay: 0.06,
    pitchEnvAmount: 0,
  },
  Alarm: {
    // Slow siren wobble that rings out
    waveType: 'square',
    toneLevel: 0.75,
    frequency: 640,
    ampAttack: 0.05,
    ampDecay: 2.0,
    pitchEnvAmount: 0,
    vibratoDepth: 0.5,
    vibratoRate: 2.5,
  },
};
