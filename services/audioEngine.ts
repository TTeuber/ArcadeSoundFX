import * as Tone from 'tone';
import { SynthParams } from '../types';

export class AudioEngine {
  private osc: Tone.Oscillator;
  private noise: Tone.Noise;
  private ampEnv: Tone.AmplitudeEnvelope;
  private oscGain: Tone.Gain;
  private noiseGain: Tone.Gain;
  private vibrato: Tone.LFO;
  private masterGain: Tone.Gain;
  public analyser: Tone.Waveform;

  // The context must be resumed (inside a user gesture) before any nodes are
  // created, otherwise Tone warns about starting sources on a suspended
  // context — hence a factory rather than `new` + a separate init call.
  static async create(): Promise<AudioEngine> {
    await Tone.start();
    return new AudioEngine();
  }

  private constructor() {
    // Create nodes
    this.masterGain = new Tone.Gain(0.5).toDestination();

    // A limiter to prevent clipping from loud arcade sounds
    const limiter = new Tone.Limiter(-1).connect(this.masterGain);

    this.ampEnv = new Tone.AmplitudeEnvelope({
      attack: 0.01,
      decay: 0.1,
      sustain: 0,
      release: 0.1,
    }).connect(limiter);

    this.analyser = new Tone.Waveform(256);
    this.masterGain.connect(this.analyser);

    // Tone Channel
    this.osc = new Tone.Oscillator().start();
    this.oscGain = new Tone.Gain(0);
    this.osc.connect(this.oscGain);
    this.oscGain.connect(this.ampEnv);

    // Noise Channel
    this.noise = new Tone.Noise('white').start();
    this.noiseGain = new Tone.Gain(0);
    this.noise.connect(this.noiseGain);
    this.noiseGain.connect(this.ampEnv);

    // Vibrato (LFO connected to detune for pitch wobble)
    this.vibrato = new Tone.LFO(5, -50, 50).start(); // Depth in cents
    this.vibrato.connect(this.osc.detune);
  }

  trigger(params: SynthParams) {
    const now = Tone.now();

    // Update Oscillator
    this.osc.type = params.waveType;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(params.frequency, now);

    // Update Noise
    this.noise.type = params.noiseType;

    // Update Levels
    this.oscGain.gain.cancelScheduledValues(now);
    this.oscGain.gain.setValueAtTime(params.toneLevel, now);

    this.noiseGain.gain.cancelScheduledValues(now);
    this.noiseGain.gain.setValueAtTime(params.noiseLevel, now);

    // Update Amp Envelope (pure AD: sustain is fixed at 0, so the sound always
    // dies out over the decay time and no release stage is ever reached)
    this.ampEnv.attack = params.ampAttack;
    this.ampEnv.decay = params.ampDecay;

    // Update Vibrato
    this.vibrato.frequency.value = params.vibratoRate;
    // Map 0-1 depth to reasonable detune cents (0 to 100 cents aka 1 semitone, or more for extreme FX)
    const depthCents = params.vibratoDepth * 1200; // Up to 1 octave range wobble
    this.vibrato.min = -depthCents / 2;
    this.vibrato.max = depthCents / 2;

    // Handle Pitch Envelope manually for flexibility
    // Attack Phase: Base -> Peak
    // Decay Phase: Peak -> Base
    const freq = params.frequency;
    const peakFreq = freq * Math.pow(2, params.pitchEnvAmount); // Calculate frequency at peak octaves

    // If Amount is 0, no pitch envelope
    if (Math.abs(params.pitchEnvAmount) > 0.01) {
      this.osc.frequency.setValueAtTime(freq, now);
      // Attack to Peak
      this.osc.frequency.linearRampToValueAtTime(peakFreq, now + params.pitchEnvAttack);
      // Decay to Base
      this.osc.frequency.exponentialRampToValueAtTime(
        freq,
        now + params.pitchEnvAttack + params.pitchEnvDecay,
      );
    }

    // Pure impulse: attack then decay to silence
    this.ampEnv.triggerAttack(now);
  }

  async render(params: SynthParams): Promise<Tone.ToneAudioBuffer> {
    const duration = params.ampAttack + params.ampDecay + 0.5; // Add some tail

    return Tone.Offline(() => {
      // Recreate the graph for offline rendering
      const masterGain = new Tone.Gain(0.5).toDestination();
      const limiter = new Tone.Limiter(-1).connect(masterGain);

      const ampEnv = new Tone.AmplitudeEnvelope({
        attack: params.ampAttack,
        decay: params.ampDecay,
        sustain: 0,
        release: 0.1,
      }).connect(limiter);

      // Tone Channel
      const osc = new Tone.Oscillator(params.frequency, params.waveType).start(0);
      const oscGain = new Tone.Gain(params.toneLevel);
      osc.connect(oscGain);
      oscGain.connect(ampEnv);

      // Noise Channel
      const noise = new Tone.Noise(params.noiseType).start(0);
      const noiseGain = new Tone.Gain(params.noiseLevel);
      noise.connect(noiseGain);
      noiseGain.connect(ampEnv);

      // Vibrato
      const vibrato = new Tone.LFO(
        params.vibratoRate,
        -params.vibratoDepth * 600,
        params.vibratoDepth * 600,
      ).start(0);
      vibrato.connect(osc.detune);

      // Pitch Envelope
      const freq = params.frequency;
      const peakFreq = freq * Math.pow(2, params.pitchEnvAmount);

      if (Math.abs(params.pitchEnvAmount) > 0.01) {
        osc.frequency.setValueAtTime(freq, 0);
        osc.frequency.linearRampToValueAtTime(peakFreq, params.pitchEnvAttack);
        osc.frequency.exponentialRampToValueAtTime(
          freq,
          params.pitchEnvAttack + params.pitchEnvDecay,
        );
      }

      // Trigger
      ampEnv.triggerAttack(0);
    }, duration);
  }
}
