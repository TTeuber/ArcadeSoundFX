import { SynthParams } from './types';

export const DEFAULT_PARAMS: SynthParams = {
  waveType: 'square',
  toneLevel: 0.8,
  frequency: 440,
  noiseType: 'white',
  noiseLevel: 0.0,
  ampAttack: 0.01,
  ampDecay: 0.3,
  ampSustain: 0.0,
  ampRelease: 0.1,
  pitchEnvAttack: 0.01,
  pitchEnvDecay: 0.2,
  pitchEnvAmount: 0,
  vibratoDepth: 0,
  vibratoRate: 5,
};

export const PRESETS: Record<string, Partial<SynthParams>> = {
  'Coin': {
    waveType: 'sine',
    toneLevel: 0.9,
    noiseLevel: 0,
    frequency: 900,
    ampAttack: 0.01,
    ampDecay: 0.3,
    ampSustain: 0,
    pitchEnvAttack: 0.01,
    pitchEnvDecay: 0.3,
    pitchEnvAmount: 0.5,
    vibratoDepth: 0
  },
  'Laser': {
    waveType: 'sawtooth',
    toneLevel: 0.8,
    noiseLevel: 0,
    frequency: 600,
    ampAttack: 0.01,
    ampDecay: 0.2,
    ampSustain: 0,
    pitchEnvAttack: 0.01,
    pitchEnvDecay: 0.2,
    pitchEnvAmount: -3, // Pitch drops
    vibratoDepth: 0
  },
  'Explosion': {
    waveType: 'sawtooth',
    toneLevel: 0.1,
    noiseLevel: 1.0,
    noiseType: 'brown',
    frequency: 100,
    ampAttack: 0.01,
    ampDecay: 0.6,
    ampSustain: 0,
    pitchEnvAmount: -2,
    vibratoDepth: 0.2,
    vibratoRate: 20
  },
  'Jump': {
    waveType: 'square',
    toneLevel: 0.8,
    noiseLevel: 0,
    frequency: 150,
    ampAttack: 0.01,
    ampDecay: 0.3,
    ampSustain: 0,
    pitchEnvAttack: 0.05,
    pitchEnvDecay: 0.2,
    pitchEnvAmount: 1.5, // Pitch goes up
    vibratoDepth: 0
  },
  'Powerup': {
    waveType: 'triangle',
    toneLevel: 0.8,
    noiseLevel: 0,
    frequency: 300,
    ampAttack: 0.01,
    ampDecay: 0.8,
    ampSustain: 0.2,
    ampRelease: 0.5,
    pitchEnvAttack: 0.1,
    pitchEnvDecay: 0.5,
    pitchEnvAmount: 2,
    vibratoDepth: 0.5,
    vibratoRate: 10
  }
};