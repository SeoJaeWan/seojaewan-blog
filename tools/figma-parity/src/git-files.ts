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
  const mergeBase = mergeBaseWith(base);
  const files = [
    ...git(['diff', '--name-only', '--no-renames', '-z', mergeBase]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '--full-name', '-z']).split('\0'),
  ].filter(Boolean);
  return { mergeBase, files };
}

/**
 * 기준 참조와 HEAD의 merge-base를 구한다.
 * @param base 기준 참조. 없으면 DEFAULT_BASES에서 있는 것을 쓴다
 * @returns merge-base 커밋
 */
export function mergeBaseWith(base: string | undefined): string {
  const ref = base ?? DEFAULT_BASES.find(hasRef);
  if (ref === undefined) {
    throw new Error('비교 기준 브랜치를 찾지 못했다. --base <ref>로 정한다.');
  }
  return git(['merge-base', ref, 'HEAD']).trim();
}

/**
 * 참조에서 거슬러 올라가는 커밋과 메시지 첫 줄을 최근 것부터 읽는다.
 * @param ref 참조
 * @returns 커밋과 메시지 첫 줄
 */
export function commitSubjects(ref: string): { commit: string; subject: string }[] {
  return git(['log', '--format=%H%x09%s', ref])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [commit = '', ...subject] = line.split('\t');
      return { commit, subject: subject.join('\t') };
    });
}

/**
 * 커밋이 다른 커밋과 같거나 그 조상인지 본다.
 * @param commit 확인할 커밋(앞부분 SHA도 된다)
 * @param descendant 기준 커밋
 * @returns 같거나 조상이면 true. 커밋을 찾지 못하면 false
 */
export function isAncestorOrSame(commit: string, descendant: string): boolean {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', `${commit}^{commit}`, descendant], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
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
 * 커밋의 파일 내용을 바이트로 읽는다(그림 파일).
 * @param commit 커밋
 * @param file 커밋 기준 경로
 * @returns 내용. 그 커밋에 파일이 없으면 undefined
 */
export function gitShowBuffer(commit: string, file: string): Buffer | undefined {
  try {
    return execFileSync('git', ['show', `${commit}:${file}`], {
      cwd: repoRoot,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
}

/**
 * 참조가 가리키는 커밋을 구한다.
 * @param ref 참조
 * @returns 커밋 SHA. 참조가 없으면 undefined
 */
export function resolveCommit(ref: string): string | undefined {
  try {
    return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
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
