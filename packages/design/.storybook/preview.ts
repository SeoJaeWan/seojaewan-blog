import type { Preview } from "@storybook/react-vite";

import "../src/ui/tokens/index.css";
import "../src/ui/tokens/theme-catalog.css";
import "./preview.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: {
        headingSelector: "h2, h3",
      },
    },
  },
};

export default preview;
