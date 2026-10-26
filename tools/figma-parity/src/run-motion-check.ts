import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';

import { changedFilesSince, gitShow } from './git-files.ts';
import { selectMotions } from './motion-scope.ts';
import { MOTION_SELECTION_ENV } from './motion-spec.ts';
import {
  FIGMA_MOTIONS_DIR,
  fromRepo,
  motionResultsDir,
  repoRoot,
  STORYBOOK_PACKAGES,
  toolRoot,
} from './paths.ts';

// 사용법: node src/run-motion-check.ts [--print-range] [--base <ref>] [--motion <이름>]... [--no-build]
// 모션 검사를 한다. json이 있는 견본(모션 클래스)의 `Motion/<이름>` 스토리를 정적 빌드한 디자인 시스템
// Storybook에서 열고 getAnimations()로 시간·이징·지연·반복 횟수를 읽어 json의 토큰 짝과 비교하고(시간 검사),
// 키프레임 값을 json 키프레임 값과 비교한다(키프레임 값 검사). 결과는 parity-results/motion/<이름>.json에 남는다.
// --print-range: 기준 브랜치와 비교해 바뀐 파일로 범위를 정하고 JSON 한 줄(`{ motions, reasons }`)만 출력한다.
//                의존성 설치·빌드 없이 돈다.
// --motion: 검사할 견본을 이름으로 고른다. 없으면 json이 있는 모든 견본이다.
const PRINT_RANGE_FLAG = '--print-range';
const BASE_FLAG = '--base';
const MOTION_FLAG = '--motion';
const NO_BUILD_FLAG = '--no-build';
const JSON_EXTENSION = '.json';

main();

/**
 * 범위를 정하거나 모션 시간 검사를 실행한다.
 * @codocs [[피그마 연동:CI]]
 */
function main(): void {
  const argv = process.argv.slice(2);
  const names = motionNames();
  if (argv.includes(PRINT_RANGE_FLAG)) {
    const baseIndex = argv.indexOf(BASE_FLAG);
    const { mergeBase, files } = changedFilesSince(
      baseIndex >= 0 ? argv[baseIndex + 1] : undefined,
    );
    const scope = selectMotions({
      changedFiles: files,
      motionNames: new Set(names),
      readChange: (file) => ({
        before: gitShow(mergeBase, file),
        after: existsSync(fromRepo(file)) ? readFileSync(fromRepo(file), 'utf8') : undefined,
      }),
    });
    process.stdout.write(
      `${JSON.stringify({ motions: scope.motions, reasons: Object.fromEntries(scope.reasons) })}\n`,
    );
    return;
  }
  const named = argv.flatMap((arg, index) => (arg === MOTION_FLAG ? [argv[index + 1] ?? ''] : []));
  const unknown = named.filter((name) => !names.includes(name));
  if (unknown.length > 0) {
    throw new Error(`json이 없는 견본이다: ${unknown.join(', ')} (${FIGMA_MOTIONS_DIR}/)`);
  }
  const selected = named.length > 0 ? named : names;
  if (selected.length === 0) {
    console.log('[motion-check] 검사할 견본이 없다.');
    return;
  }
  console.log(`[motion-check] 검사할 견본: ${selected.join(', ')}`);
  if (!argv.includes(NO_BUILD_FLAG)) {
    run(
      'pnpm',
      ['--filter', `./${STORYBOOK_PACKAGES['design-system']}`, 'run', 'build-storybook'],
      {
        failure: '디자인 시스템 Storybook 빌드',
      },
    );
  }
  // 지난 실행의 견본 결과가 PR 댓글에 섞이지 않게 비운다.
  rmSync(motionResultsDir, { recursive: true, force: true });
  const status = run('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.motion.config.ts'], {
    cwd: toolRoot,
    env: { [MOTION_SELECTION_ENV]: JSON.stringify(selected) },
  });
  process.exitCode = status;
}

/**
 * 저장소에 json이 있는 견본 이름을 정렬해 구한다.
 * @returns 견본 이름
 */
function motionNames(): string[] {
  const dir = fromRepo(FIGMA_MOTIONS_DIR);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((file) => file.endsWith(JSON_EXTENSION))
    .map((file) => file.slice(0, -JSON_EXTENSION.length))
    .sort();
}

/**
 * 명령을 실행한다. Windows(pnpm.cmd)에서도 찾도록 셸로 실행한다.
 * @param command 명령
 * @param args 인자(공백 없는 고정 값)
 * @param options 작업 폴더, 더할 환경 변수, 실패하면 멈출 때 쓸 이름
 * @param options.cwd 작업 폴더(기본은 저장소 루트)
 * @param options.env 더할 환경 변수
 * @param options.failure 실패하면 멈출 때 쓸 이름. 없으면 종료 코드만 돌려준다
 * @returns 종료 코드
 */
function run(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: Record<string, string>; failure?: string },
): number {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...options.env },
  });
  const status = result.status ?? 1;
  if (status !== 0 && options.failure !== undefined) {
    throw new Error(`${options.failure}가 실패했다.`);
  }
  return status;
}
