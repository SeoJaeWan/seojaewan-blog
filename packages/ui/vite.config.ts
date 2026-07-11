import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    react(),
    dts({
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.tsx"],
      insertTypesEntry: true,
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      cssFileName: "styles",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@fluentui/react-icons",
        "@radix-ui/react-slot",
        "react",
        "react-dom",
        "react/jsx-runtime",
      ],
    },
  },
});
