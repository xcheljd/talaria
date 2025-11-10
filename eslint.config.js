import globals from "globals";
import pluginJs from "@eslint/js";
import pluginPrettier from "eslint-plugin-prettier/recommended";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        JSZip: 'readonly',
      },
      ecmaVersion: 2021,
      sourceType: "module",
    },
  },
  pluginJs.configs.recommended,
  pluginPrettier,
  {
    files: ["src/js/**/*.js"],
    rules: {
      "no-unused-vars": "warn",
      // Add any specific ESLint rules you want to enforce here
      // For example, to disallow console.log in production:
      // "no-console": "warn"
    },
  },
];