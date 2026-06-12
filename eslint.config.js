import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        JSZip: 'readonly',
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginPrettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);