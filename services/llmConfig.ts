// URL of the deployed Cloudflare Worker that proxies Anthropic API calls
// (see SETUP_TODO.md and worker/). Public by design — the API key lives in
// the Worker's secret store, never here. Leave empty to disable the shared
// backend; the prompt bar then only offers the bring-your-own-key mode.
export const WORKER_URL = 'https://arcadesoundfx-ai.tteuber.workers.dev';

// Model used for direct (bring-your-own-key) calls from the browser. The
// shared backend's model is configured separately in worker/wrangler.jsonc.
export const BYO_KEY_MODEL = 'claude-haiku-4-5';
