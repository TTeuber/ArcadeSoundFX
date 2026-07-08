import { SynthParams } from '../types';
import { sanitizeParams } from '../utils/params';
import { WORKER_URL, BYO_KEY_MODEL } from './llmConfig';
import { SOUND_SYSTEM_PROMPT, SOUND_SCHEMA } from './soundSchema';

export interface GeneratedSound {
  name: string;
  params: SynthParams;
}

export type SoundPromptErrorCode =
  | 'not_configured' // no worker URL and no user key
  | 'rate_limited' // shared backend daily limit hit
  | 'auth' // bad user-supplied API key
  | 'bad_response' // model output didn't parse
  | 'network'; // fetch/API failure

export class SoundPromptError extends Error {
  constructor(
    public code: SoundPromptErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SoundPromptError';
  }
}

export function isConfigured(apiKey: string | null): boolean {
  return Boolean(WORKER_URL || apiKey);
}

// Generates synth params from a text description. Uses the user's own
// Anthropic key directly from the browser when provided, otherwise the
// shared rate-limited Worker backend.
export async function generateSound(
  prompt: string,
  apiKey: string | null,
): Promise<GeneratedSound> {
  const result = apiKey ? await generateDirect(prompt, apiKey) : await generateViaWorker(prompt);
  const record = result as { name?: unknown; params?: unknown };
  if (typeof record.params !== 'object' || record.params === null) {
    throw new SoundPromptError('bad_response', 'The AI response was missing parameters.');
  }
  return {
    name: typeof record.name === 'string' ? record.name.slice(0, 24) : 'AI SOUND',
    params: sanitizeParams(record.params as Record<string, unknown>),
  };
}

async function generateViaWorker(prompt: string): Promise<unknown> {
  if (!WORKER_URL) {
    throw new SoundPromptError(
      'not_configured',
      'The shared AI backend is not configured. Add your own Anthropic API key to use this feature.',
    );
  }
  let response: Response;
  try {
    response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  } catch {
    throw new SoundPromptError('network', 'Could not reach the AI backend.');
  }
  if (response.status === 429) {
    throw new SoundPromptError(
      'rate_limited',
      'The free daily limit is used up. Add your own Anthropic API key to keep going.',
    );
  }
  if (!response.ok) {
    throw new SoundPromptError('network', `AI backend error (${response.status}).`);
  }
  return response.json();
}

async function generateDirect(prompt: string, apiKey: string): Promise<unknown> {
  // Loaded on demand so visitors who never use their own key don't download
  // the SDK. Requires the explicit browser opt-in; the key stays on-device.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await client.messages.create({
      model: BYO_KEY_MODEL,
      max_tokens: 1024,
      system: SOUND_SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: SOUND_SCHEMA } },
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content.find((block) => block.type === 'text');
    if (!text || response.stop_reason === 'refusal') {
      throw new SoundPromptError('bad_response', 'The model returned no result.');
    }
    return JSON.parse(text.text);
  } catch (error) {
    if (error instanceof SoundPromptError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new SoundPromptError('auth', 'That API key was rejected — check it and try again.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new SoundPromptError('network', `Anthropic API error: ${error.message}`);
    }
    if (error instanceof SyntaxError) {
      throw new SoundPromptError('bad_response', 'The AI response could not be parsed.');
    }
    throw new SoundPromptError('network', 'Could not reach the Anthropic API.');
  }
}
