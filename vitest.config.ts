import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/*',
      'packages/*',
      'tools/*',
      // 저장소 루트 scripts/의 테스트. 폴더에 package.json이 없어 프로젝트를 여기서 정한다.
      { test: { name: 'repo-scripts', environment: 'node', include: ['scripts/**/*.test.mjs'] } },
    ],
    passWithNoTests: true,
  },
});
