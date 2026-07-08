// Prompt + JSON schema for the "describe a sound" feature.
// NOTE: worker/src/index.ts keeps its own copy of these two constants (the
// Worker is a separate package) — if you edit here, mirror the change there.

export const SOUND_SYSTEM_PROMPT = `You are a sound designer for an 8-bit arcade sound-effects synthesizer. The user describes a sound; you answer with synth parameters that produce it.

The engine:
- One tone oscillator: waveType square (classic chiptune), sawtooth (harsh, laser-like), triangle (hollow, mellow), or sine (soft, pure). toneLevel 0-1, base frequency 50-2000 Hz.
- One noise source: white (hits, snares), pink (softer wash), brown (explosions, rumble). noiseLevel 0-1. Tone and noise can be mixed.
- Amplitude envelope is attack-decay only: ampAttack 0.001-1 s, ampDecay 0.01-2 s, then silence. Short decay = blips and clicks; long decay = booms and rings.
- Pitch envelope: frequency ramps from base to peak over pitchEnvAttack (0.001-1 s), then back to base over pitchEnvDecay (0.01-1 s). pitchEnvAmount sets the peak in octaves, -4 to 4: negative falls (lasers, hurt sounds), positive rises (jumps, powerups). To jump up and STAY at the higher pitch, use a pitchEnvDecay much longer than ampDecay so the return leg is inaudible. Use 0 for no sweep.
- Vibrato: vibratoDepth 0-1 (each 0.1 of depth is roughly +/- 0.6 semitones of wobble; 0.5 sounds like a siren), vibratoRate 0.1-20 Hz.

Give the sound a short retro-styled display name (24 characters max, e.g. "SAD LASER", "MEGA COIN").`;

export const SOUND_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'params'],
  properties: {
    name: {
      type: 'string',
      description: 'Short retro display name for the sound, max 24 characters, uppercase',
    },
    params: {
      type: 'object',
      additionalProperties: false,
      required: [
        'waveType',
        'toneLevel',
        'frequency',
        'noiseType',
        'noiseLevel',
        'ampAttack',
        'ampDecay',
        'pitchEnvAttack',
        'pitchEnvDecay',
        'pitchEnvAmount',
        'vibratoDepth',
        'vibratoRate',
      ],
      properties: {
        waveType: { type: 'string', enum: ['square', 'sawtooth', 'triangle', 'sine'] },
        toneLevel: { type: 'number', description: '0 to 1' },
        frequency: { type: 'number', description: 'Base frequency in Hz, 50 to 2000' },
        noiseType: { type: 'string', enum: ['white', 'pink', 'brown'] },
        noiseLevel: { type: 'number', description: '0 to 1' },
        ampAttack: { type: 'number', description: 'Seconds, 0.001 to 1' },
        ampDecay: { type: 'number', description: 'Seconds, 0.01 to 2' },
        pitchEnvAttack: { type: 'number', description: 'Seconds, 0.001 to 1' },
        pitchEnvDecay: { type: 'number', description: 'Seconds, 0.01 to 1' },
        pitchEnvAmount: { type: 'number', description: 'Octaves to sweep, -4 to 4, 0 disables' },
        vibratoDepth: { type: 'number', description: '0 to 1' },
        vibratoRate: { type: 'number', description: 'Hz, 0.1 to 20' },
      },
    },
  },
} as const;
