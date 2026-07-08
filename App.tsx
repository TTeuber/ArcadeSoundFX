import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_PARAMS, PRESETS } from './constants';
import { SynthParams, WaveType, NoiseType } from './types';
import type { AudioEngine } from './services/audioEngine';
import { Slider } from './components/Slider';
import { OscVisualizer } from './components/OscVisualizer';
import { PromptBar } from './components/PromptBar';
import { Play, Dice5, Volume2, Zap, Waves, Activity, Download, Undo2 } from 'lucide-react';
import { audioBufferToWav } from './utils/wavEncoder';
import { clampParam, sanitizeParams, NUMERIC_KEYS, WAVE_TYPES, NOISE_TYPES } from './utils/params';
import { encodeParamsToHash, decodeParamsFromHash } from './utils/urlState';

const HISTORY_LIMIT = 20;

export default function App() {
  const [params, setParams] = useState<SynthParams>(
    () => decodeParamsFromHash(window.location.hash) ?? DEFAULT_PARAMS,
  );
  const [history, setHistory] = useState<SynthParams[]>([]);
  const engineRef = useRef<AudioEngine | null>(null);
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Keep the URL hash in sync so the current sound is always shareable.
  useEffect(() => {
    window.history.replaceState(null, '', `#${encodeParamsToHash(params)}`);
  }, [params]);

  // Browsers require a user gesture before audio can start, so the engine is
  // only created once inside one — every sound-producing action funnels
  // through here. Tone.js is imported dynamically because merely importing it
  // creates an AudioContext, which Chrome warns about before a gesture.
  const ensureEngine = async (): Promise<AudioEngine> => {
    if (!engineRef.current) {
      const { AudioEngine } = await import('./services/audioEngine');
      const newEngine = await AudioEngine.create();
      engineRef.current = newEngine;
      setEngine(newEngine);
    }
    return engineRef.current;
  };

  const play = async (p: SynthParams) => {
    (await ensureEngine()).trigger(p);
  };

  const handlePlay = () => play(params);

  // Spacebar triggers the current sound (unless the user is typing or
  // pressing an actual button, where space already means "click").
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || target.isContentEditable)
          return;
      }
      e.preventDefault();
      play(paramsRef.current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bulk parameter changes (presets, randomize, AI) go through here so the
  // previous sound is always one UNDO away.
  const applyParams = (next: SynthParams) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), paramsRef.current]);
    setParams(next);
    play(next);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      setParams(previous);
      play(previous);
      return h.slice(0, -1);
    });
  };

  const handleExport = async () => {
    const toneBuffer = await (await ensureEngine()).render(params);
    const buffer = toneBuffer.get() as AudioBuffer;

    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `arcade-sound-fx-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      // Merge over defaults (not current params) so a preset always sounds
      // the same regardless of what was dialed in before; sanitize so an
      // out-of-range preset value can never escape the slider ranges.
      applyParams(sanitizeParams({ ...DEFAULT_PARAMS, ...preset }));
    }
  };

  // Randomize around a preset archetype most of the time (uniform-random
  // parameters mostly produce junk), with an occasional fully wild roll.
  const randomize = () => {
    const wild = Math.random() < 0.15;
    let next: SynthParams;

    if (wild) {
      next = {
        waveType: WAVE_TYPES[Math.floor(Math.random() * WAVE_TYPES.length)],
        toneLevel: Math.random() > 0.3 ? Math.random() * 0.5 + 0.5 : 0,
        frequency: 100 + Math.random() * 900,
        noiseType: NOISE_TYPES[Math.floor(Math.random() * NOISE_TYPES.length)],
        noiseLevel: Math.random() > 0.7 ? Math.random() * 0.8 : 0,
        ampAttack: 0.01 + Math.random() * 0.1,
        ampDecay: 0.1 + Math.random() * 0.7,
        pitchEnvAttack: 0.01 + Math.random() * 0.2,
        pitchEnvDecay: 0.1 + Math.random() * 0.4,
        pitchEnvAmount: Math.random() * 6 - 3,
        vibratoDepth: Math.random() > 0.8 ? Math.random() * 0.6 : 0,
        vibratoRate: 2 + Math.random() * 16,
      };
    } else {
      const archetypes = Object.values(PRESETS);
      const base: SynthParams = {
        ...DEFAULT_PARAMS,
        ...archetypes[Math.floor(Math.random() * archetypes.length)],
      };
      const jitter = (v: number) => v * (0.7 + Math.random() * 0.6);
      next = {
        ...base,
        waveType:
          Math.random() < 0.25
            ? WAVE_TYPES[Math.floor(Math.random() * WAVE_TYPES.length)]
            : base.waveType,
        frequency: jitter(base.frequency),
        ampAttack: jitter(base.ampAttack),
        ampDecay: jitter(base.ampDecay),
        pitchEnvAttack: jitter(base.pitchEnvAttack),
        pitchEnvDecay: jitter(base.pitchEnvDecay),
        pitchEnvAmount: base.pitchEnvAmount + (Math.random() - 0.5),
        vibratoDepth: base.vibratoDepth > 0 ? jitter(base.vibratoDepth) : base.vibratoDepth,
        vibratoRate: jitter(base.vibratoRate),
      };
    }

    for (const key of NUMERIC_KEYS) {
      next[key] = clampParam(key, next[key]);
    }
    applyParams(next);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 crt-grid z-50 pointer-events-none opacity-20"></div>

      <div className="max-w-5xl w-full bg-[#16161a] border-4 border-[#7f5af0] shadow-[0_0_20px_rgba(127,90,240,0.5)] p-6 relative z-10">
        {/* Header */}
        <header className="mb-4 border-b-2 border-[#2cb67d] pb-4">
          <h1 className="text-4xl md:text-5xl text-[#fffffe] drop-shadow-[2px_2px_0_#7f5af0]">
            ARCADE SOUND <span className="text-[#2cb67d]">FX</span>
          </h1>
          <p className="text-[#94a1b2] mt-1 text-lg tracking-widest">8-BIT SYNTHESIS ENGINE</p>
        </header>

        {/* Preset Bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(PRESETS).map((presetName) => (
            <button
              key={presetName}
              onClick={() => applyPreset(presetName)}
              className="px-3 py-1 border border-[#94a1b2] text-[#94a1b2] hover:bg-[#7f5af0] hover:text-white hover:border-[#7f5af0] transition-colors text-sm uppercase"
            >
              {presetName}
            </button>
          ))}
          <button
            onClick={randomize}
            className="px-3 py-1 border border-[#ff8906] text-[#ff8906] hover:bg-[#ff8906] hover:text-black hover:border-[#ff8906] transition-colors text-sm uppercase flex items-center gap-1"
          >
            <Dice5 size={16} /> RND
          </button>
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="px-3 py-1 border border-[#94a1b2] text-[#94a1b2] hover:bg-[#94a1b2] hover:text-black transition-colors text-sm uppercase flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#94a1b2]"
          >
            <Undo2 size={16} /> Undo
          </button>
        </div>

        {/* AI Prompt Bar */}
        <PromptBar onGenerated={(sound) => applyParams(sound.params)} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Scope & Transport */}
          <div className="flex flex-col">
            <OscVisualizer engine={engine} />

            <button
              onClick={handlePlay}
              className="w-full py-6 bg-[#2cb67d] text-[#16161a] font-bold text-3xl border-b-4 border-[#1a7852] active:border-0 active:mt-1 active:mb-0 mb-1 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Play fill="currentColor" size={32} /> TRIGGER
            </button>

            <button
              onClick={handleExport}
              className="w-full py-4 bg-[#7f5af0] text-[#fffffe] font-bold text-xl border-b-4 border-[#5f43b2] active:border-0 active:mt-1 active:mb-0 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Download size={24} /> EXPORT WAV
            </button>

            <p className="mt-4 text-center text-xs text-[#555] uppercase tracking-widest">
              Space bar = trigger
            </p>

            <div className="mt-6 p-4 border border-[#7f5af0] bg-[#242629]">
              <h2 className="text-[#7f5af0] text-xl mb-4 flex items-center gap-2">
                <Activity size={20} /> MASTER ENV (AD)
              </h2>
              <Slider
                label="Attack"
                value={params.ampAttack}
                min={0.001}
                max={1.0}
                step={0.01}
                unit="s"
                onChange={(v) => setParams((p) => ({ ...p, ampAttack: v }))}
              />
              <Slider
                label="Decay"
                value={params.ampDecay}
                min={0.01}
                max={2.0}
                step={0.01}
                unit="s"
                onChange={(v) => setParams((p) => ({ ...p, ampDecay: v }))}
              />
            </div>
          </div>

          {/* Column 2: Tone OSC (with vibrato) */}
          <div className="flex flex-col gap-6">
            <div className="p-5 border-2 border-[#2cb67d] bg-[#1e1e24]">
              <div className="flex justify-between items-center mb-4 text-[#2cb67d]">
                <h2 className="text-2xl flex items-center gap-2">
                  <Waves size={24} /> TONE OSC
                </h2>
              </div>

              <div className="flex gap-1 mb-6 bg-slate-800 p-1">
                {(['square', 'sawtooth', 'triangle', 'sine'] as WaveType[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => setParams((p) => ({ ...p, waveType: w }))}
                    className={`flex-1 py-2 text-center text-xs uppercase font-bold transition-colors ${params.waveType === w ? 'bg-[#2cb67d] text-[#0f0e17]' : 'text-[#94a1b2] hover:bg-slate-700'}`}
                  >
                    {w.slice(0, 3)}
                  </button>
                ))}
              </div>

              <Slider
                label="Level"
                value={params.toneLevel}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => setParams((p) => ({ ...p, toneLevel: v }))}
              />
              <Slider
                label="Freq"
                value={Math.round(params.frequency)}
                min={50}
                max={2000}
                step={10}
                unit="Hz"
                onChange={(v) => setParams((p) => ({ ...p, frequency: v }))}
              />

              <div className="mt-6 border-t border-slate-700 pt-4">
                <h3 className="text-[#94a1b2] text-sm mb-2 uppercase">Vibrato</h3>
                <Slider
                  label="Depth"
                  value={params.vibratoDepth}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => setParams((p) => ({ ...p, vibratoDepth: v }))}
                />
                <Slider
                  label="Rate"
                  value={params.vibratoRate}
                  min={0.1}
                  max={20}
                  step={0.1}
                  unit="Hz"
                  onChange={(v) => setParams((p) => ({ ...p, vibratoRate: v }))}
                />
              </div>
            </div>
          </div>

          {/* Column 3: Noise OSC + Pitch Env */}
          <div className="flex flex-col gap-6">
            <div className="p-5 border-2 border-[#ff8906] bg-[#1e1e24]">
              <div className="flex justify-between items-center mb-4 text-[#ff8906]">
                <h2 className="text-2xl flex items-center gap-2">
                  <Volume2 size={24} /> NOISE OSC
                </h2>
              </div>

              <div className="flex gap-1 mb-6 bg-slate-800 p-1">
                {(['white', 'pink', 'brown'] as NoiseType[]).map((n) => (
                  <button
                    key={n}
                    onClick={() => setParams((p) => ({ ...p, noiseType: n }))}
                    className={`flex-1 py-2 text-center text-xs uppercase font-bold transition-colors ${params.noiseType === n ? 'bg-[#ff8906] text-[#0f0e17]' : 'text-[#94a1b2] hover:bg-slate-700'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <Slider
                label="Level"
                value={params.noiseLevel}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => setParams((p) => ({ ...p, noiseLevel: v }))}
              />
            </div>

            <div className="p-4 border border-[#f25f4c] bg-[#242629]">
              <h2 className="text-[#f25f4c] text-xl mb-4 flex items-center gap-2">
                <Zap size={20} /> PITCH ENV
              </h2>
              <Slider
                label="Attack"
                value={params.pitchEnvAttack}
                min={0.001}
                max={1.0}
                step={0.01}
                unit="s"
                onChange={(v) => setParams((p) => ({ ...p, pitchEnvAttack: v }))}
              />
              <Slider
                label="Decay"
                value={params.pitchEnvDecay}
                min={0.01}
                max={1.0}
                step={0.01}
                unit="s"
                onChange={(v) => setParams((p) => ({ ...p, pitchEnvDecay: v }))}
              />
              <Slider
                label="Mod Amt"
                value={params.pitchEnvAmount}
                min={-4}
                max={4}
                step={0.1}
                unit="oct"
                onChange={(v) => setParams((p) => ({ ...p, pitchEnvAmount: v }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[#555] text-xs uppercase">
          Powered by Tone.js • React • Tailwind
        </div>
      </div>
    </div>
  );
}
