import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This app talks to an external REST API, not a Next.js-managed data
      // source, so the standard "setLoading(true) at the top of a fetch
      // effect, cancelled-flag cleanup" pattern is used throughout. That is
      // exactly what this rule flags; the alternative (a data-fetching
      // library) is out of scope for this build phase.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
