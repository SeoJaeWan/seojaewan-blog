import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

import { reactConfig } from "./react.js";

export const nextConfig = (options = {}) =>
  tseslint.config(
    ...reactConfig(options),
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        "@next/next/no-html-link-for-pages": "error",
        "@next/next/no-img-element": "error",
        "@next/next/no-sync-scripts": "error",
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["../*"],
                message: "상위 상대경로 대신 @/* 또는 @window/* import를 사용하세요.",
              },
              {
                group: [
                  "@window/ui/src/*",
                  "packages/ui/src/*",
                  "../../packages/ui/src/*",
                  "../../../packages/ui/src/*",
                ],
                message: "@window/ui public export를 사용하세요.",
              },
            ],
          },
        ],
      },
    },
    prettier,
  );

export default nextConfig;
