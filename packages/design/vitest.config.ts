import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDirectory = join(dirname(fileURLToPath(import.meta.url)), ".storybook");

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          include: ["src/headless/**/*.test.ts", "src/testing/**/*.test.ts"],
          name: "headless",
        },
      },
      {
        extends: true,
        test: {
          environment: "jsdom",
          include: ["src/headless/**/*.test.tsx"],
          name: "headless-react",
        },
      },
      {
        extends: true,
        test: {
          environment: "jsdom",
          include: ["src/ui/**/*.test.{ts,tsx}"],
          name: "ui",
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: configDirectory,
          }),
        ],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright(),
          },
          name: "storybook",
        },
      },
    ],
  },
});
