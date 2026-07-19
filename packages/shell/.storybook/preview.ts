import type { Preview } from "@storybook/react-vite";

import "@window/ui/styles.css";
import "../stories/shellHarness.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;
