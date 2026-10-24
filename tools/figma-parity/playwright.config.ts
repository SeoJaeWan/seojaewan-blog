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
    // 글꼴 힌팅은 글자 폭을 정수로 반올림하고 획을 픽셀에 맞춰, 같은 글꼴이어도 피그마와 글자 폭·모양이 달라진다.
    // @codocs [[피그마 연동:캡처 표]]
    launchOptions: { args: ['--font-render-hinting=none'] },
  },
});
