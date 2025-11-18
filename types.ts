export type WaveType = 'square' | 'sawtooth' | 'triangle' | 'sine';
export type NoiseType = 'white' | 'pink' | 'brown';

export interface SynthParams {
  // Tone Oscillator
  waveType: WaveType;
  toneLevel: number; // 0 to 1
  frequency: number; // Base frequency in Hz

  // Noise Oscillator
  noiseType: NoiseType;
  noiseLevel: number; // 0 to 1

  // Amp Envelope (AD)
  ampAttack: number; // seconds
  ampDecay: number; // seconds
  ampSustain: number; // 0 to 1 (We will mostly keep this low for SFX)
  ampRelease: number; // seconds

  // Pitch Envelope (AD)
  pitchEnvAttack: number; // seconds
  pitchEnvDecay: number; // seconds
  pitchEnvAmount: number; // Octaves to sweep (positive or negative)

  // Vibrato
  vibratoDepth: number; // 0 to 1
  vibratoRate: number; // Hz
}
