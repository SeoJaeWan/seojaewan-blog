import type { Preview } from "@storybook/react-vite";

import "../src/ui/tokens/index.css";
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
