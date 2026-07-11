import type { StorybookConfig } from "@storybook/react-vite";
import { createRequire } from "node:module";
import { mergeConfig } from "vite";

const nodeRequire = createRequire(import.meta.url);
const fluentRequire = createRequire(nodeRequire.resolve("@fluentui/react-icons"));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: (storybookConfig) =>
    mergeConfig(storybookConfig, {
      resolve: {
        alias: {
          "@griffel/core": fluentRequire.resolve("@griffel/core"),
          "@griffel/react": fluentRequire.resolve("@griffel/react"),
        },
      },
    }),
};

export default config;
