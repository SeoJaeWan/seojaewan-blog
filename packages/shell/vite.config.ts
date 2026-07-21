import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const isStorybookLifecycle = ["build:storybook", "dev"].includes(
  process.env.npm_lifecycle_event ?? "",
);

export default defineConfig({
  plugins: [
    react(),
    ...(isStorybookLifecycle
      ? []
      : [
          dts({
            exclude: [".storybook/**/*", "stories/**/*", "src/**/*.test.ts", "src/**/*.test.tsx"],
            insertTypesEntry: true,
            tsconfigPath: "./tsconfig.json",
          }),
        ]),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@window/ui", "react", "react-dom", "react/jsx-runtime"],
    },
  },
});
