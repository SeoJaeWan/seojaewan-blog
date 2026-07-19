import { reactConfig } from "@window/eslint-config/react";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default [
  ...reactConfig({ tsconfigRootDir }),
  {
    files: ["src/**/*.{ts,tsx}", "stories/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "@window/web",
                "@window/web/*",
                "apps/web/*",
                "../../apps/web/*",
                "../../../apps/web/*",
              ],
              message: "@window/shell은 Next app 또는 web app 코드에 의존할 수 없습니다.",
            },
          ],
        },
      ],
    },
  },
];
