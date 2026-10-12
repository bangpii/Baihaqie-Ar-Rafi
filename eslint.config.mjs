import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored upstream WebGL components (customized copies; linted via oxlint ignore banner).
    "app/components/dither-veil/DitherVeil.jsx",
    "app/components/light-rays/LightRays.jsx",
    "app/components/paper-background/PaperBackground.jsx",
  ]),
]);

export default eslintConfig;
