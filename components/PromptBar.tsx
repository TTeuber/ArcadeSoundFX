import React, { useState } from 'react';
import { Sparkles, KeyRound, LoaderCircle } from 'lucide-react';
import { generateSound, isConfigured, SoundPromptError, GeneratedSound } from '../services/soundPrompt';

const API_KEY_STORAGE = 'arcadesfx_api_key';

interface PromptBarProps {
  onGenerated: (sound: GeneratedSound) => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({ onGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(API_KEY_STORAGE) ?? '';
    } catch {
      return '';
    }
  });

  const saveKey = (value: string) => {
    setApiKey(value);
    try {
      if (value) localStorage.setItem(API_KEY_STORAGE, value);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      // Private browsing without storage — key just lives for this session.
    }
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLastName(null);

    const key = apiKey.trim() || null;
    if (!isConfigured(key)) {
      setError('No AI backend configured — click the key icon to use your own Anthropic API key.');
      setShowKeyPanel(true);
      return;
    }

    setLoading(true);
    try {
      const sound = await generateSound(trimmed, key);
      setLastName(sound.name);
      onGenerated(sound);
    } catch (err) {
      if (err instanceof SoundPromptError) {
        setError(err.message);
        if (err.code === 'rate_limited' || err.code === 'not_configured' || err.code === 'auth') {
          setShowKeyPanel(true);
        }
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-3 border-2 border-[#e53170] bg-[#1e1e24]">
      <div className="flex gap-2 items-stretch">
        <div className="flex items-center gap-2 flex-1 bg-slate-800 border border-slate-600 px-3">
          <Sparkles size={18} className="text-[#e53170] shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGenerate();
            }}
            placeholder='Describe a sound... "a sad laser powering down"'
            maxLength={200}
            className="w-full bg-transparent py-2 text-lg text-[#fffffe] placeholder-[#94a1b2]/60 focus:outline-none"
            aria-label="Describe a sound to generate"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="px-4 bg-[#e53170] text-[#fffffe] font-bold text-lg border-b-4 border-[#a3234f] active:border-0 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
          GENERATE
        </button>
        <button
          onClick={() => setShowKeyPanel((v) => !v)}
          title="Use your own Anthropic API key"
          aria-label="Use your own Anthropic API key"
          className={`px-3 border transition-colors ${
            apiKey
              ? 'border-[#2cb67d] text-[#2cb67d]'
              : 'border-[#94a1b2] text-[#94a1b2] hover:border-[#e53170] hover:text-[#e53170]'
          }`}
        >
          <KeyRound size={18} />
        </button>
      </div>

      {showKeyPanel && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <label className="block text-xs text-[#94a1b2] uppercase mb-1" htmlFor="byo-key">
            Your Anthropic API key (optional — bypasses the shared daily limit)
          </label>
          <input
            id="byo-key"
            type="password"
            value={apiKey}
            onChange={(e) => saveKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-[#fffffe] placeholder-[#94a1b2]/60 focus:outline-none focus:border-[#e53170]"
          />
          <p className="mt-1 text-xs text-[#94a1b2]/80 leading-relaxed">
            Stored only in your browser (localStorage) and sent directly to Anthropic — never to
            this site's server. Get a key at console.anthropic.com.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-[#f25f4c]">{error}</p>}
      {lastName && !error && (
        <p className="mt-2 text-sm text-[#2cb67d] tracking-widest">&#9654; {lastName}</p>
      )}
    </div>
  );
};
