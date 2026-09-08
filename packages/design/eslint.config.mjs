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

const headlessDomGlobals = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "requestAnimationFrame",
  "cancelAnimationFrame",
].map((name) => ({
  message: `Headless must remain independent of the ${name} browser global.`,
  name,
}));

const pureAsyncGlobals = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
].map((name) => ({
  message: `Pure headless modules must not schedule work with ${name}.`,
  name,
}));

export default [
  ...reactConfig({ tsconfigRootDir }),
  {
    files: ["src/headless/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...headlessDomGlobals],
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
    files: ["src/headless/**/{model,commands,selectors}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...headlessDomGlobals, ...pureAsyncGlobals],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^react(?:-dom)?(?:/|$)",
              message: "Pure headless model, command, and selector modules must not depend on React.",
            },
            {
              regex:
                "^(?:@notionhq/client|axios|idb|ky|localforage|node:(?:dns|fs|http|https|net|tls))(?:/|$)",
              message: "Pure headless modules must not depend on persistence or network infrastructure.",
            },
          ],
        },
      ],
    },
  },
];
