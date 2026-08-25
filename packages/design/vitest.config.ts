import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          include: ["src/core/**/*.test.{ts,tsx}"],
          name: "core",
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
        test: {
          environment: "jsdom",
          include: ["src/shell/**/*.test.{ts,tsx}"],
          name: "shell",
        },
      },
    ],
  },
});
