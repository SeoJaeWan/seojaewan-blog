import type { TreeEntry } from './github-client';

// 커밋할 브랜치의 파일(경로 → blob SHA)과 이번에 쓸 파일을 비교해 트리 변경을 정한다.
// 같은 내용은 같은 blob SHA라, SHA가 다른 파일만 바꾸면 바뀐 것이 없을 때 커밋도 생기지 않는다.

/** 트리 변경 계획 */
export type TreePlan = {
  /** 트리 항목(바뀐 파일과 지울 파일) */
  entries: TreeEntry[];
  /** 새로 생기거나 내용이 바뀐 파일 경로 */
  changed: string[];
  /** 지울 파일 경로 */
  deleted: string[];
};

/**
 * 쓸 파일 가운데 브랜치와 SHA가 다른 것만 바꾸고, 맡은 폴더 바로 아래에 있지만 쓸 파일에 없는 파일은 지운다.
 * 맡은 폴더 밖의 파일은 지우지 않는다(다른 대상의 파일을 건드리지 않는다).
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param desired 쓸 파일 경로 → blob SHA
 * @param current 커밋할 브랜치의 파일 경로 → blob SHA
 * @param ownedFolders 이 커밋이 맡은 폴더(끝에 `/` 없음). 이전 이름의 폴더도 넣으면 통째로 지운다
 * @returns 트리 변경 계획
 */
export function planTree(
  desired: ReadonlyMap<string, string>,
  current: ReadonlyMap<string, string>,
  ownedFolders: readonly string[],
): TreePlan {
  const changed = [...desired]
    .filter(([path, sha]) => current.get(path) !== sha)
    .map(([path]) => path)
    .sort();
  const deleted = [...current.keys()]
    .filter((path) => !desired.has(path) && ownedFolders.includes(parentFolder(path)))
    .sort();
  return {
    entries: [
      ...changed.map((path) => ({ path, sha: desired.get(path) ?? null })),
      ...deleted.map((path) => ({ path, sha: null })),
    ],
    changed,
    deleted,
  };
}

/**
 * 파일 경로의 폴더를 구한다.
 * @param path 파일 경로
 * @returns 마지막 `/` 앞부분
 */
export function parentFolder(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}
