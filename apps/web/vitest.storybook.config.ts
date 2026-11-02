import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 스토리를 실제 Chromium에서 그려 play와 axe 검사를 돌린다. jsdom 단위 테스트(vitest.config.ts)와 나눈다.
export default defineProject({
  // 첫 스토리가 무거운 모듈을 받느라 15초 제한을 넘기지 않게 미리 묶어 둔다.
  optimizeDeps: { include: ['react-dom/client', '@storybook/addon-a11y > axe-core'] },
  plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
  test: {
    name: 'storybook-web',
    setupFiles: ['./vitest.storybook.setup.ts'],
    browser: {
      // 스토리 기본 화면(`pc`, `BREAKPOINTS`의 노트북 경계값)과 같게 두어 파일마다 화면 크기를 두 번 바꾸지 않게 한다.
      // 패키지 진입점은 Vite 설정 로더가 읽지 못하고 앱의 상위 폴더 import는 lint가 막아 값을 직접 적는다.
      viewport: { width: 1600, height: 900 },
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
