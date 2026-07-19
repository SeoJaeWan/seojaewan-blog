import type { StorybookConfig } from "@storybook/react-vite";
import { createRequire } from "node:module";
import { mergeConfig } from "vite";

const uiRequire = createRequire(new URL("../../ui/package.json", import.meta.url));
const fluentRequire = createRequire(uiRequire.resolve("@fluentui/react-icons"));

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest"],
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
        dedupe: ["react", "react-dom"],
      },
    }),
};

export default config;
