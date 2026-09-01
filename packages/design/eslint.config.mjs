import { reactConfig } from "@window/eslint-config/react";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

const applicationImports = {
  regex:
    "^(?:next(?:/|$)|@window/(?:app|web)(?:/|$)|apps?(?:/|$)|(?:\\.\\./)+(?:application|apps?)(?:/|$))",
  message: "Design layers must not depend on application code.",
};

const legacyPackageImports = {
  regex: "^@window/(?:ui|shell)(?:/|$)",
  message: "Use the local design layer indexes instead of legacy packages.",
};

const headlessGlobals = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
].map((name) => ({
  message: `Headless must remain independent of the ${name} runtime global.`,
  name,
}));

export default [
  ...reactConfig({ tsconfigRootDir }),
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            applicationImports,
            legacyPackageImports,
            {
              regex: "^(?:\\.\\./)+(?:headless|core|shell)(?:/|$)",
              message: "UI must not depend on headless or retired layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/headless/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...headlessGlobals],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            applicationImports,
            legacyPackageImports,
            {
              regex: "^(?:\\.\\./)+(?:ui|core|shell)(?:/|$)",
              message: "Headless must not depend on UI or retired layers.",
            },
            {
              regex: "^react(?:-dom)?(?:/|$)",
              message: "Headless must not depend on React or ReactDOM.",
            },
            {
              regex:
                "^(?:@notionhq/client|axios|idb|ky|localforage|node:(?:dns|fs|http|https|net|tls))(?:/|$)",
              message: "Headless must not depend on persistence or network infrastructure.",
            },
          ],
        },
      ],
    },
  },
];
