import { defineConfig, devices } from '@playwright/test';

import { PARITY_PORT } from './parity-config.ts';

// @codocs [[피그마 일치 검사:CI 비교]]
// 피그마 일치 검사를 Playwright Test로 돌린다. 변형(과 BOOLEAN 경우)마다 테스트 하나다.
// 보통은 run-parity.ts가 영향 범위를 정하고 Storybook을 빌드한 뒤 이 설정으로 실행한다.
export default defineConfig({
  testDir: '.',
  testMatch: 'parity.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  reporter: [['list']],
  outputDir: '../../node_modules/.cache/parity-test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${String(PARITY_PORT)}`,
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'node scripts/parity/serve-storybook.ts',
    cwd: '../..',
    url: `http://127.0.0.1:${String(PARITY_PORT)}/index.json`,
    reuseExistingServer: !process.env.CI,
  },
});
