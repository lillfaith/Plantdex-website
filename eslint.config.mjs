import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships native flat config, so no eslintrc compat shim is needed.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // supabase/functions runs on Deno, a separate runtime with its own globals and module
    // resolution (npm:/https: specifiers, Deno.serve) — not this project's ESLint/TS setup.
    // video/ is a standalone Remotion package with its own tsconfig and dependencies.
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'supabase/functions/**', 'video/**'],
  },
];

export default eslintConfig;
