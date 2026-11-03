import { defineConfig, devices } from '@playwright/test';

import { BREAKPOINTS } from '@seojaewan/design-system';

import type { BehaviorOptions } from './e2e/behaviors/behavior-test.ts';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCi = Boolean(process.env.CI);
// 시나리오 케이스의 실행해보기(tools/scenario-cases)만 동작 사이를 늦추고 동작 표시를 오래 보여 사람이 따라 볼 수 있게 한다.
const slowMo = Number(process.env.SCENARIO_CASES_SLOW_MO ?? 0);
const actionAnnotationMs = Number(process.env.SCENARIO_CASES_ACTION_MS ?? 100);

// @codocs [[테스트 작성 규칙:E2E]]
// 스크린샷 비교 없이 사용자 흐름만 확인하고, 동작 줄이기 상태에서 돈다. 시험은 행위 정의 파일에서 만든다(e2e/behaviors.test.ts).
export default defineConfig<BehaviorOptions>({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    reducedMotion: 'reduce',
    launchOptions: { slowMo },
    actionAnnotationMs,
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
