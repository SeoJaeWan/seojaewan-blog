import { defineConfig } from 'vitest/config';

// @codocs [[테스트 작성 규칙:실행 시점]]
// 단위 project는 `unit-`, 스토리 project는 `storybook-`으로 시작해 `--project 'unit-*'`처럼 고른다.
export default defineConfig({
  test: {
    projects: [
      'apps/*',
      'packages/*',
      'tools/*',
      // 폴더 glob은 vitest.config.ts만 잡으므로 스토리 설정은 파일로 적는다.
      'apps/web/vitest.storybook.config.ts',
      'packages/design-system/vitest.storybook.config.ts',
      // 저장소 루트 scripts/의 테스트. 폴더에 package.json이 없어 프로젝트를 여기서 정한다.
      {
        test: {
          name: 'unit-repo-scripts',
          environment: 'node',
          include: ['scripts/**/*.test.mjs'],
        },
      },
      // @codocs [[Notion 이미지 제공:주소]]
      // 블로그와 이미지 서버가 같은 주소 모양을 쓰는지 두 앱을 함께 불러 보는 시험. 두 앱은 서로 import하지 않는다.
      {
        test: {
          name: 'unit-repo-contracts',
          environment: 'node',
          include: ['contracts/**/*.test.ts'],
        },
      },
    ],
    passWithNoTests: true,
  },
});
