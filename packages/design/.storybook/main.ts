import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin } from "vite";
import { mergeConfig } from "vite";

const preserveBaseUiReselectBindings = {
  name: "workbench:preserve-base-ui-reselect-bindings",
  enforce: "pre",
  transform(code, id) {
    if (!id.endsWith("/@base-ui/utils/store/createSelectorMemoized.mjs")) {
      return undefined;
    }

    return {
      code,
      map: null,
      moduleSideEffects: "no-treeshake",
    };
  },
} satisfies Plugin;

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest", "storybook-addon-pseudo-states"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  /**
   * Vite 8.1/Rolldown 1.1이 Base UI의 store barrel을 분할할 때
   * createSelectorMemoized 초기화만 남기고 reselect binding을 제거하는 것을 피한다.
   *
   * Storybook 번들에서 해당 모듈을 tree-shaking 대상에서 제외해 binding을 보존한다.
   */
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [preserveBaseUiReselectBindings],
    }),
};

export default config;
