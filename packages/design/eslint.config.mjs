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

const headlessLayerImports = [
  applicationImports,
  legacyPackageImports,
  {
    regex: "^@base-ui/react(?:/|$)",
    message: "Headless must not depend on Base UI.",
  },
  {
    regex: "^(?:\\.\\./)+(?:ui)(?:/|$)",
    message: "Headless must not depend on product UI.",
  },
];

const coreGlobals = [
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
  message: `Core must remain independent of the ${name} runtime global.`,
  name,
}));

export default [
  ...reactConfig({ tsconfigRootDir }),
  {
    files: ["src/headless/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: headlessLayerImports,
        },
      ],
    },
  },
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
              regex: "^(?:\\.\\./)+(?:core|shell)(?:/|$)",
              message: "UI must not depend on Core or Shell.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...coreGlobals],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            applicationImports,
            legacyPackageImports,
            {
              regex: "^(?:\\.\\./)+(?:ui|shell)(?:/|$)",
              message: "Core must not depend on UI or Shell.",
            },
            {
              regex: "^react(?:-dom)?(?:/|$)",
              message: "Core must not depend on React or ReactDOM.",
            },
            {
              regex:
                "^(?:@notionhq/client|axios|idb|ky|localforage|node:(?:dns|fs|http|https|net|tls))(?:/|$)",
              message: "Core must not depend on persistence or network infrastructure.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shell/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            applicationImports,
            legacyPackageImports,
            {
              regex: "^(?!\\.\\./(?:ui|core)$)(?:\\.\\./)+(?:ui|core)(?:/|$)",
              message: "Shell must import UI and Core through their exact layer indexes.",
            },
          ],
        },
      ],
    },
  },
];
