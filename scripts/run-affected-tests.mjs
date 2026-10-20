import { execFileSync, spawnSync } from 'node:child_process';

// @codocs [[테스트 작성 규칙:실행 시점]]
// 바뀐 파일에 영향받는 테스트만 실행한다(`vitest related`).
// import 관계로 연결되지 않는 설정·전역 파일이 바뀌면 전체 테스트를 실행한다.
const GLOBAL_FILE_PATTERN =
  /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig(\.[\w-]+)?\.json|vitest\.(config|setup)\.[cm]?[jt]s|eslint\.config\.[cm]?js|theme\.css|globals\.css|preview\.css)$/u;
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|mjs|cjs)$/u;

const stagedFiles = execFileSync(
  'git',
  ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);

const hasGlobalChange = stagedFiles.some((file) => GLOBAL_FILE_PATTERN.test(file));
const sourceFiles = stagedFiles.filter(
  (file) => SOURCE_FILE_PATTERN.test(file) && !file.startsWith('apps/web/e2e/'),
);

let vitestArgs = null;
if (hasGlobalChange) {
  console.log('[pre-commit] 설정·전역 파일이 바뀌어 전체 테스트를 실행한다.');
  vitestArgs = ['run'];
} else if (sourceFiles.length > 0) {
  console.log('[pre-commit] 바뀐 파일에 영향받는 테스트를 실행한다.');
  vitestArgs = ['related', '--run', ...sourceFiles];
} else {
  console.log('[pre-commit] 테스트에 영향을 주는 파일이 없다.');
}

if (vitestArgs !== null) {
  const result = spawnSync('pnpm', ['exec', 'vitest', ...vitestArgs, '--passWithNoTests'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exitCode = result.status ?? 1;
}
