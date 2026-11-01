import { defineConfig, devices } from '@playwright/test';

import { BREAKPOINTS } from '@seojaewan/design-system';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCi = Boolean(process.env.CI);

// @codocs [[테스트 작성 규칙:E2E]]
// 스크린샷 비교 없이 사용자 흐름만 확인하고, 동작 줄이기 상태에서 돈다.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      // 기본 화면(1280×720)은 노트북 구간이라 PC 구간의 가장 작은 크기로 고정한다. 다른 구간은 시험마다 화면을 바꾼다.
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: BREAKPOINTS.laptopWidth, height: BREAKPOINTS.laptopHeight },
      },
    },
  ],
  webServer: {
    command: 'pnpm start',
    url: BASE_URL,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
