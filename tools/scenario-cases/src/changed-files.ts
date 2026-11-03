import { execFileSync } from 'node:child_process';

import { repoRoot } from './paths.ts';

/**
 * git 명령을 돌려 출력 줄을 돌려준다.
 * @param args git 인자
 * @returns 빈 줄을 뺀 출력 줄
 */
function git(args: string[]): string[] {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * 이번 PR에서 바뀐 파일을 구한다. `origin/main`과 갈라진 곳부터 지금 작업 트리까지(커밋하지 않은 것과
 * 새 파일 포함) 바뀐 파일이다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param base 비교할 가지
 * @returns 비교한 커밋과 바뀐 파일(저장소 기준). git을 못 쓰면 null
 */
export function readChangedFiles(base = 'origin/main'): { base: string; files: string[] } | null {
  try {
    const [mergeBase] = git(['merge-base', base, 'HEAD']);
    if (mergeBase === undefined) {
      return null;
    }
    const files = new Set([
      ...git(['diff', '--name-only', mergeBase]),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]);
    return { base: `${base}@${mergeBase.slice(0, 7)}`, files: [...files].sort() };
  } catch {
    return null;
  }
}
