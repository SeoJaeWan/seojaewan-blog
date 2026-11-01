import { defineConfig, devices } from '@playwright/test';

import { CAPTURE_VIEWPORT } from './src/capture-viewport.ts';

// @codocs [[피그마 연동:모션]]
// 모션 시간 검사를 Playwright Test로 돌린다. 견본마다 테스트 하나다. Storybook 정적 서버는 motion-check.spec.ts가 띄운다.
// 보통은 run-motion-check.ts가 범위를 정하고 Storybook을 빌드한 뒤 이 설정으로 실행한다.
// 애니메이션을 켜고 도는 유일한 Playwright 검사라 동작 줄이기를 쓰지 않는다([[테스트 작성 규칙:E2E]]).
export default defineConfig({
  testDir: 'src',
  testMatch: ['motion-check.spec.ts'],
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  outputDir: 'node_modules/.cache/playwright-motion-results',
  use: {
    ...devices['Desktop Chrome'],
    // 모션 스토리도 PC 구간 크기로 고정한다([[피그마 연동:캡처 표]]).
    viewport: { ...CAPTURE_VIEWPORT },
    reducedMotion: 'no-preference',
  },
});
