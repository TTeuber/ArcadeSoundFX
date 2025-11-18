import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_PARAMS, PRESETS } from './constants';
import { SynthParams, WaveType, NoiseType } from './types';
import { AudioEngine } from './services/audioEngine';
import { Slider } from './components/Slider';
import { OscVisualizer } from './components/OscVisualizer';
import { Play, Dice5, Volume2, Zap, Waves, Activity } from 'lucide-react';

export default function App() {
  const [params, setParams] = useState<SynthParams>(DEFAULT_PARAMS);
  const engineRef = useRef<AudioEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Engine once
  useEffect(() => {
    engineRef.current = new AudioEngine();
    return () => {
      // Cleanup if necessary, Tone.js contexts usually persist
    };
  }, []);

  const handlePlay = async () => {
    if (!engineRef.current) return;
    
    if (!isInitialized) {
        await engineRef.current.init();
        setIsInitialized(true);
    }
    engineRef.current.trigger(params);
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      setParams(prev => ({ ...prev, ...preset }));
      // Auto play on preset select (optional, but nice for browsing)
      // We need to wait for state update or just pass the new params directly
      if(engineRef.current && isInitialized) {
         engineRef.current.trigger({ ...params, ...preset });
      }
    }
  };

  const randomize = () => {
    const waves: WaveType[] = ['square', 'sawtooth', 'triangle', 'sine'];
    const noises: NoiseType[] = ['white', 'pink', 'brown'];
    
    const randomParams: SynthParams = {
        waveType: waves[Math.floor(Math.random() * waves.length)],
        toneLevel: Math.random() > 0.3 ? Math.random() * 0.5 + 0.5 : 0, // Bias towards tone on
        frequency: 100 + Math.random() * 800,
        noiseType: noises[Math.floor(Math.random() * noises.length)],
        noiseLevel: Math.random() > 0.7 ? Math.random() * 0.8 : 0, // Bias towards noise off unless specific
        ampAttack: 0.01 + Math.random() * 0.1,
        ampDecay: 0.1 + Math.random() * 0.5,
        ampSustain: 0,
        ampRelease: 0.1,
        pitchEnvAttack: 0.01 + Math.random() * 0.2,
        pitchEnvDecay: 0.1 + Math.random() * 0.4,
        pitchEnvAmount: (Math.random() * 6) - 3, // -3 to +3 octaves
        vibratoDepth: Math.random() > 0.8 ? Math.random() : 0,
        vibratoRate: 5 + Math.random() * 15,
    };
    
    setParams(randomParams);
    if(engineRef.current && isInitialized) {
        engineRef.current.trigger(randomParams);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 crt-grid z-50 pointer-events-none opacity-20"></div>
      
      <div className="max-w-4xl w-full bg-[#16161a] border-4 border-[#7f5af0] shadow-[0_0_20px_rgba(127,90,240,0.5)] p-6 relative z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-2 border-[#2cb67d] pb-4">
          <div>
            <h1 className="text-4xl md:text-5xl text-[#fffffe] drop-shadow-[2px_2px_0_#7f5af0]">
              ARCADE SFX <span className="text-[#2cb67d]">GEN</span>
            </h1>
            <p className="text-[#94a1b2] mt-1 text-lg tracking-widest">8-BIT SYNTHESIS ENGINE</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            {Object.keys(PRESETS).map(presetName => (
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
                 <Dice5 size={16}/> RND
               </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Column: Visuals & Master Control */}
            <div className="md:col-span-4 flex flex-col">
                <OscVisualizer engine={engineRef.current} />
                
                <button 
                    onClick={handlePlay}
                    className="w-full py-6 bg-[#2cb67d] text-[#16161a] font-bold text-3xl border-b-4 border-[#1a7852] active:border-0 active:mt-1 active:mb-0 mb-1 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                    <Play fill="currentColor" size={32}/> TRIGGER
                </button>

                <div className="mt-8 p-4 border border-[#7f5af0] bg-[#242629]">
                    <h2 className="text-[#7f5af0] text-xl mb-4 flex items-center gap-2"><Activity size={20}/> MASTER ENV (AD)</h2>
                     <Slider label="Attack" value={params.ampAttack} min={0.001} max={1.0} step={0.01} unit="s" onChange={(v) => setParams(p => ({...p, ampAttack: v}))} />
                     <Slider label="Decay" value={params.ampDecay} min={0.01} max={2.0} step={0.01} unit="s" onChange={(v) => setParams(p => ({...p, ampDecay: v}))} />
                </div>

                 <div className="mt-4 p-4 border border-[#f25f4c] bg-[#242629]">
                    <h2 className="text-[#f25f4c] text-xl mb-4 flex items-center gap-2"><Zap size={20}/> PITCH ENV</h2>
                     <Slider label="Attack" value={params.pitchEnvAttack} min={0.001} max={1.0} step={0.01} unit="s" onChange={(v) => setParams(p => ({...p, pitchEnvAttack: v}))} />
                     <Slider label="Decay" value={params.pitchEnvDecay} min={0.01} max={1.0} step={0.01} unit="s" onChange={(v) => setParams(p => ({...p, pitchEnvDecay: v}))} />
                     <Slider label="Mod Amt" value={params.pitchEnvAmount} min={-4} max={4} step={0.1} unit="oct" onChange={(v) => setParams(p => ({...p, pitchEnvAmount: v}))} />
                </div>
            </div>

            {/* Right Column: Generators */}
            <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tone Oscillator */}
                <div className="p-5 border-2 border-[#2cb67d] bg-[#1e1e24]">
                    <div className="flex justify-between items-center mb-4 text-[#2cb67d]">
                        <h2 className="text-2xl flex items-center gap-2"><Waves size={24}/> TONE OSC</h2>
                    </div>
                    
                    <div className="flex gap-1 mb-6 bg-slate-800 p-1">
                        {(['square', 'sawtooth', 'triangle', 'sine'] as WaveType[]).map((w) => (
                            <button
                                key={w}
                                onClick={() => setParams(p => ({...p, waveType: w}))}
                                className={`flex-1 py-2 text-center text-xs uppercase font-bold transition-colors ${params.waveType === w ? 'bg-[#2cb67d] text-[#0f0e17]' : 'text-[#94a1b2] hover:bg-slate-700'}`}
                            >
                                {w.slice(0,3)}
                            </button>
                        ))}
                    </div>

                    <Slider label="Level" value={params.toneLevel} min={0} max={1} step={0.01} onChange={(v) => setParams(p => ({...p, toneLevel: v}))} />
                    <Slider label="Freq" value={Math.round(params.frequency)} min={50} max={2000} step={10} unit="Hz" onChange={(v) => setParams(p => ({...p, frequency: v}))} />
                    
                    <div className="mt-6 border-t border-slate-700 pt-4">
                        <h3 className="text-[#94a1b2] text-sm mb-2 uppercase">Vibrato</h3>
                        <Slider label="Depth" value={params.vibratoDepth} min={0} max={1} step={0.01} onChange={(v) => setParams(p => ({...p, vibratoDepth: v}))} />
                        <Slider label="Rate" value={params.vibratoRate} min={0.1} max={20} step={0.1} unit="Hz" onChange={(v) => setParams(p => ({...p, vibratoRate: v}))} />
                    </div>
                </div>

                {/* Noise Oscillator */}
                <div className="p-5 border-2 border-[#ff8906] bg-[#1e1e24]">
                    <div className="flex justify-between items-center mb-4 text-[#ff8906]">
                        <h2 className="text-2xl flex items-center gap-2"><Volume2 size={24}/> NOISE OSC</h2>
                    </div>

                     <div className="flex gap-1 mb-6 bg-slate-800 p-1">
                        {(['white', 'pink', 'brown'] as NoiseType[]).map((n) => (
                            <button
                                key={n}
                                onClick={() => setParams(p => ({...p, noiseType: n}))}
                                className={`flex-1 py-2 text-center text-xs uppercase font-bold transition-colors ${params.noiseType === n ? 'bg-[#ff8906] text-[#0f0e17]' : 'text-[#94a1b2] hover:bg-slate-700'}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>

                    <Slider label="Level" value={params.noiseLevel} min={0} max={1} step={0.01} onChange={(v) => setParams(p => ({...p, noiseLevel: v}))} />
                    
                    <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700">
                        <p className="text-xs text-[#94a1b2] leading-relaxed">
                            TIP: Mix "Brown" noise with a low frequency saw wave for explosions. Use "White" noise with a short decay for snares or hits.
                        </p>
                    </div>
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