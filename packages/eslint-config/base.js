import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["**/*.{js,mjs,cjs,ts,tsx}"];
const tsFiles = ["**/*.{ts,tsx}"];

const commonIgnores = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/dist/**",
  "**/storybook-static/**",
  "**/*.tsbuildinfo",
  "**/next-env.d.ts",
];

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: tsFiles,
}));

export const baseConfig = ({ tsconfigRootDir = process.cwd() } = {}) =>
  tseslint.config(
    {
      ignores: commonIgnores,
    },
    {
      ...js.configs.recommended,
      files: sourceFiles,
      languageOptions: {
        ecmaVersion: "latest",
        globals: {
          ...globals.browser,
          ...globals.node,
        },
        sourceType: "module",
      },
    },
    ...typeCheckedConfigs,
    {
      files: tsFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
    },
    {
      files: sourceFiles,
      plugins: {
        "simple-import-sort": simpleImportSort,
      },
      rules: {
        curly: ["error", "all"],
        eqeqeq: ["error", "always"],
        "no-console": ["warn", { allow: ["warn", "error"] }],
        "no-debugger": "error",
        "no-var": "error",
        "prefer-const": "error",
        "simple-import-sort/exports": "error",
        "simple-import-sort/imports": [
          "error",
          {
            groups: [
              ["^\\u0000"],
              ["^react", "^next"],
              ["^@window/"],
              ["^@/"],
              ["^@?\\w"],
              ["^\\."],
              ["^.+\\.css$"],
            ],
          },
        ],
      },
    },
    {
      files: tsFiles,
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
          },
        ],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: {
              attributes: false,
            },
          },
        ],
        "@typescript-eslint/no-unnecessary-type-assertion": "warn",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/await-thenable": "error",
      },
    },
    prettier,
  );

export default baseConfig;
