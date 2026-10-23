import { defineConfig, devices } from '@playwright/test';

// @codocs [[피그마 연동:CI]]
// 캡처를 Playwright Test로 돌린다. 변형마다 테스트 하나다. Storybook 정적 서버는 capture.spec.ts가 띄운다.
// 보통은 run-capture.ts가 캡처 범위를 정하고 Storybook을 빌드한 뒤 이 설정으로 실행한다.
// 배율은 capture.spec.ts가 figma.json에서 정한다.
export default defineConfig({
  testDir: 'src',
  testMatch: ['capture.spec.ts'],
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  outputDir: 'node_modules/.cache/playwright-test-results',
  use: {
    ...devices['Desktop Chrome'],
  },
});
