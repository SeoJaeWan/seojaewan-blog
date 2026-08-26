import type { Preview } from "@storybook/react-vite";

// @ts-expect-error -- Storybook resolves CSS side-effect imports through Vite.
import "../src/ui/tokens/index.css";
// @ts-expect-error -- Storybook resolves CSS side-effect imports through Vite.
import "../src/ui/tokens/theme-catalog.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
