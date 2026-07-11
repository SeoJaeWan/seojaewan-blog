import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

import { baseConfig } from "./base.js";

const reactFiles = ["**/*.{jsx,tsx}"];

export const reactConfig = (options = {}) =>
  tseslint.config(
    ...baseConfig(options),
    {
      files: reactFiles,
      plugins: {
        "react-hooks": reactHooks,
      },
      rules: {
        "react-hooks/exhaustive-deps": "warn",
        "react-hooks/rules-of-hooks": "error",
      },
    },
    prettier,
  );

export default reactConfig;
