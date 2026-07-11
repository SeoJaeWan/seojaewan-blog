import { reactConfig } from "@window/eslint-config/react";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

const functionalSyntaxRestrictions = [
  {
    message: "@window/ui에서는 React hook이나 custom hook을 import할 수 없습니다.",
    selector: "ImportSpecifier[imported.name=/^use(?:[A-Z].*)?$/]",
  },
  {
    message:
      "@window/ui에서는 context를 만들 수 없습니다. provider와 context는 @window/shell에 둡니다.",
    selector: "ImportSpecifier[imported.name='createContext']",
  },
  {
    message: "@window/ui에서는 React hook을 호출할 수 없습니다.",
    selector:
      "CallExpression[callee.object.name='React'][callee.property.name=/^use(?:[A-Z].*)?$/]",
  },
  {
    message: "@window/ui에서는 React hook이나 custom hook을 호출할 수 없습니다.",
    selector: "CallExpression[callee.name=/^use[A-Z]/]",
  },
  {
    message: "@window/ui에서는 context를 만들 수 없습니다.",
    selector: "CallExpression[callee.object.name='React'][callee.property.name='createContext']",
  },
  {
    message: "@window/ui에서는 custom hook을 선언할 수 없습니다.",
    selector: "FunctionDeclaration[id.name=/^use[A-Z]/]",
  },
  {
    message: "@window/ui에서는 custom hook을 선언할 수 없습니다.",
    selector: "VariableDeclarator[id.name=/^use[A-Z]/]",
  },
  {
    message: "@window/ui에서는 provider를 선언할 수 없습니다.",
    selector: "FunctionDeclaration[id.name=/Provider$/]",
  },
  {
    message: "@window/ui에서는 provider를 선언할 수 없습니다.",
    selector: "VariableDeclarator[id.name=/Provider$/]",
  },
];

const browserRuntimeRestrictions = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "ResizeObserver",
  "IntersectionObserver",
  "MutationObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
].map((name) => ({
  message: `@window/ui에서는 ${name} browser runtime API를 사용할 수 없습니다. @window/shell에서 연결하세요.`,
  name,
}));

export default [
  ...reactConfig({ tsconfigRootDir }),
  {
    files: ["src/**/*.{ts,tsx}"],
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
              message: "@window/ui는 Next app 또는 web app 코드에 의존할 수 없습니다.",
            },
            {
              group: ["@window/shell", "@window/shell/*"],
              message: "@window/ui는 @window/shell에 의존할 수 없습니다.",
            },
            {
              regex: "^(?:\\.\\./)+(?:packages/)?shell(?:/|$)",
              message: "@window/ui는 shell package 내부를 상대경로로 import할 수 없습니다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.stories.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "no-restricted-globals": ["error", ...browserRuntimeRestrictions],
      "no-restricted-syntax": ["error", ...functionalSyntaxRestrictions],
    },
  },
  {
    files: ["src/**/*.stories.tsx"],
    rules: {
      "no-restricted-globals": ["error", ...browserRuntimeRestrictions],
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
              message: "@window/ui는 Next app 또는 web app 코드에 의존할 수 없습니다.",
            },
            {
              group: ["@window/shell", "@window/shell/*"],
              message: "UI Storybook은 @window/shell에 의존할 수 없습니다.",
            },
            {
              group: ["@storybook/addon-actions", "@storybook/test", "storybook/test"],
              message: "UI Storybook은 interaction test가 아니라 정적 visual catalog입니다.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        ...functionalSyntaxRestrictions,
        {
          message: "UI Storybook에서는 play interaction을 정의할 수 없습니다.",
          selector: "Property[key.name='play']",
        },
      ],
    },
  },
];
