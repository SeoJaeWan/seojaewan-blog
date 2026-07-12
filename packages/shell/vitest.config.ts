import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // REMOVE: @window/ui dist 없이 shell test를 실행하기 위한 alias; UI package build가 복구되면 제거한다.
      "@window/ui": fileURLToPath(
        new URL(
          "../ui/src/components/taskbar/panel/taskbarPanelLayerUI/index.tsx",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "jsdom",
  },
});
