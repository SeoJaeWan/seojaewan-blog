import { execFileSync } from 'node:child_process';

import { repoRoot } from './paths.ts';

// 캡처 범위와 모션 검사 범위가 함께 쓰는 git 읽기. 저장소를 바꾸지 않는다.

/** 기준 브랜치를 주지 않았을 때 차례로 찾는 참조다 */
export const DEFAULT_BASES = ['origin/main', 'main'] as const;

/**
 * 기준 참조와의 merge-base 이후 바뀐 파일(커밋하지 않은 변경과 추적하지 않는 새 파일 포함)을 구한다.
 * @param base 기준 참조. 없으면 DEFAULT_BASES에서 있는 것을 쓴다
 * @returns merge-base 커밋과 저장소 기준 경로 목록
 */
export function changedFilesSince(base: string | undefined): {
  mergeBase: string;
  files: string[];
} {
  const ref = base ?? DEFAULT_BASES.find(hasRef);
  if (ref === undefined) {
    throw new Error('비교 기준 브랜치를 찾지 못했다. --base <ref>로 정한다.');
  }
  const mergeBase = git(['merge-base', ref, 'HEAD']).trim();
  const files = [
    ...git(['diff', '--name-only', '--no-renames', '-z', mergeBase]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '--full-name', '-z']).split('\0'),
  ].filter(Boolean);
  return { mergeBase, files };
}

/**
 * git 명령을 실행한다.
 * @param args 인자
 * @returns 표준 출력
 */
export function git(args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * 커밋의 파일 내용을 읽는다.
 * @param commit 커밋
 * @param file 저장소 기준 경로
 * @returns 내용. 그 커밋에 파일이 없으면 undefined
 */
export function gitShow(commit: string, file: string): string | undefined {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
}

/**
 * git 참조가 있는지 본다.
 * @param ref 참조
 * @returns 있으면 true
 */
export function hasRef(ref: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}
