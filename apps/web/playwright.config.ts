import { defineConfig, devices } from '@playwright/test';

import { BREAKPOINTS } from '@seojaewan/design-system';

import type { BehaviorOptions } from './e2e/behaviors/behavior-test.ts';

// 앱 서버 포트. 기본은 Next.js 기본 포트(3000)이고 CI도 이 포트로 돈다. 3000번이 쓰이고 있으면 로컬에서
// Playwright를 바로 실행할 때 `E2E_PORT`로 바꾼다(`pnpm test:e2e`는 turbo가 이 변수를 넘기지 않는다).
const port = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = `http://localhost:${String(port)}`;
const isCi = Boolean(process.env.CI);
// 시나리오 케이스의 실행해보기(tools/scenario-cases)만 동작 사이를 늦추고 동작 표시를 오래 보여 사람이 따라 볼 수 있게 한다.
const slowMo = Number(process.env.SCENARIO_CASES_SLOW_MO ?? 0);
const actionAnnotationMs = Number(process.env.SCENARIO_CASES_ACTION_MS ?? 100);

// @codocs [[콘텐츠 원천:읽는 곳]]
// E2E는 fixture를 읽는 빌드로 돈다. 앱 빌드(`pnpm build`)와 시험 모두 `CONTENT_SOURCE=fixture`로 실행해야
// 첫 화면의 글 색인과 본문 경로가 같은 fixture를 읽는다. 기본값(notion)으로 조용히 돌지 않게 막는다.
if (process.env.CONTENT_SOURCE !== 'fixture') {
  throw new Error(
    'E2E는 CONTENT_SOURCE=fixture로 빌드하고 실행한다. 예: CONTENT_SOURCE=fixture pnpm test:e2e',
  );
}

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
    command: `pnpm start --port ${String(port)}`,
    url: BASE_URL,
    // CI는 이번 빌드가 아닌 다른 서버로 시험하지 않도록, 포트가 이미 쓰이고 있으면 실패한다.
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
