import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // worker/ is its own package (Cloudflare Workers types + generated d.ts)
  { ignores: ['dist', 'worker'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  // Just the classic hooks rules; the plugin's recommended config also ships
  // the React Compiler lints, which false-positive on impure calls
  // (Math.random etc.) inside event handlers.
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
