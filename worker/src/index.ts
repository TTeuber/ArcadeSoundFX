import Anthropic from '@anthropic-ai/sdk';

// Prompt + schema for sound generation.
// NOTE: mirrored in ../services/soundSchema.ts (the frontend's copy, used for
// bring-your-own-key calls) — keep the two in sync.

const SOUND_SYSTEM_PROMPT = `You are a sound designer for an 8-bit arcade sound-effects synthesizer. The user describes a sound; you answer with synth parameters that produce it.

The engine:
- One tone oscillator: waveType square (classic chiptune), sawtooth (harsh, laser-like), triangle (hollow, mellow), or sine (soft, pure). toneLevel 0-1, base frequency 50-2000 Hz.
- One noise source: white (hits, snares), pink (softer wash), brown (explosions, rumble). noiseLevel 0-1. Tone and noise can be mixed.
- Amplitude envelope is attack-decay only: ampAttack 0.001-1 s, ampDecay 0.01-2 s, then silence. Short decay = blips and clicks; long decay = booms and rings.
- Pitch envelope: frequency ramps from base to peak over pitchEnvAttack (0.001-1 s), then back to base over pitchEnvDecay (0.01-1 s). pitchEnvAmount sets the peak in octaves, -4 to 4: negative falls (lasers, hurt sounds), positive rises (jumps, powerups). To jump up and STAY at the higher pitch, use a pitchEnvDecay much longer than ampDecay so the return leg is inaudible. Use 0 for no sweep.
- Vibrato: vibratoDepth 0-1 (each 0.1 of depth is roughly +/- 0.6 semitones of wobble; 0.5 sounds like a siren), vibratoRate 0.1-20 Hz.

Give the sound a short retro-styled display name (24 characters max, e.g. "SAD LASER", "MEGA COIN").`;

const SOUND_SCHEMA = {
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

// Env comes from the generated worker-configuration.d.ts (`npm run types`).

function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    const originAllowed = allowedOrigins.includes(origin);
    // Echo only allowed origins back; everything else gets a dead header.
    const cors = originAllowed ? origin : allowedOrigins[0];

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(cors) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST only', code: 'bad_request' }, 405, cors);
    }
    if (!originAllowed) {
      return json({ error: 'Origin not allowed', code: 'forbidden' }, 403, cors);
    }

    let prompt: unknown;
    try {
      const body = (await request.json()) as { prompt?: unknown };
      prompt = body.prompt;
    } catch {
      return json({ error: 'Invalid JSON body', code: 'bad_request' }, 400, cors);
    }
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 200) {
      return json(
        { error: 'prompt must be a non-empty string of at most 200 characters', code: 'bad_request' },
        400,
        cors,
      );
    }

    // Rate limiting: daily KV counters, per-IP and global. Check both before
    // incrementing so a rejected request never burns quota; increments happen
    // off the critical path. KV is eventually consistent, so a burst can
    // slightly overshoot a limit — acceptable here; the Anthropic console
    // spend limit is the hard backstop.
    const today = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const ipKey = `ip:${ip}:${today}`;
    const globalKey = `global:${today}`;
    const [ipCount, globalCount] = await Promise.all([
      env.RATE_LIMITS.get(ipKey),
      env.RATE_LIMITS.get(globalKey),
    ]);
    const ipUsed = parseInt(ipCount ?? '0', 10);
    const globalUsed = parseInt(globalCount ?? '0', 10);
    if (ipUsed >= parseInt(env.DAILY_LIMIT_PER_IP, 10)) {
      return json({ error: 'Daily limit for your IP reached', code: 'rate_limited' }, 429, cors);
    }
    if (globalUsed >= parseInt(env.DAILY_LIMIT_GLOBAL, 10)) {
      return json({ error: 'Global daily limit reached', code: 'rate_limited' }, 429, cors);
    }
    ctx.waitUntil(
      Promise.all([
        env.RATE_LIMITS.put(ipKey, String(ipUsed + 1), { expirationTtl: 172800 }),
        env.RATE_LIMITS.put(globalKey, String(globalUsed + 1), { expirationTtl: 172800 }),
      ]),
    );

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const response = await client.messages.create({
        model: env.MODEL,
        max_tokens: 1024,
        system: SOUND_SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: SOUND_SCHEMA } },
        messages: [{ role: 'user', content: prompt.trim() }],
      });
      const text = response.content.find((block) => block.type === 'text');
      if (!text || response.stop_reason === 'refusal') {
        return json({ error: 'Model returned no result', code: 'bad_response' }, 502, cors);
      }
      // Structured output guarantees the shape; the frontend still clamps values.
      return new Response(text.text, {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders(cors) },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        const status = error.status === 429 ? 429 : 502;
        return json({ error: 'Upstream API error', code: 'upstream' }, status, cors);
      }
      return json({ error: 'Unexpected error', code: 'upstream' }, 502, cors);
    }
  },
} satisfies ExportedHandler<Env>;
