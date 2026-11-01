import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 스토리를 실제 Chromium에서 그려 play와 axe 검사를 돌린다. jsdom 단위 테스트(vitest.config.ts)와 나눈다.
export default defineProject({
  plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
  test: {
    name: 'storybook-design-system',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
