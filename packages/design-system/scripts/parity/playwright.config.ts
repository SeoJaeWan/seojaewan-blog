import { defineConfig, devices } from '@playwright/test';

import { PARITY_PORT } from './parity-config.ts';

// @codocs [[피그마 일치 검사:CI 비교]]
// 피그마 일치 검사를 Playwright Test로 돌린다. 변형(과 BOOLEAN 경우)마다 테스트 하나다.
// 보통은 run-parity.ts가 영향 범위를 정하고 Storybook을 빌드한 뒤 이 설정으로 parity.spec.ts를 실행한다.
// proof.spec.ts는 비교 도구가 틀린 코드를 잡는지 확인한다(test:parity-proof).
// capture.spec.ts는 판정 없이 캡처 표 이미지를 만든다(run-parity.ts --capture). 배율은 그 파일이 figma.json에서 정한다.
export default defineConfig({
  testDir: '.',
  testMatch: ['parity.spec.ts', 'proof.spec.ts', 'capture.spec.ts'],
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
