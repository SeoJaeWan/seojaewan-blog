import type { TreeEntry } from './github-client';
import { ASSETS_DIR, CHANGESET_DIR, COMPONENTS_DIR, TOKENS_PATH } from './plugin-config';

// 커밋할 브랜치의 파일(경로 → blob SHA)과 이번에 쓸 파일(경로 → 플러그인에서 계산한 blob SHA)을 비교해 트리 변경을 정한다.
// 같은 내용은 같은 blob SHA라, SHA가 다른 파일만 올리고 바꾸면 바뀐 것이 없을 때 커밋도 생기지 않는다.

/** 트리 만들기 요청 하나에 넣는 최대 항목 수 */
export const TREE_CHUNK_SIZE = 100;

/**
 * 저장소에서 읽어 비교하는 파일 범위. 플러그인이 쓰는 경로(토큰, 자산 원본, 컴포넌트 스키마·검증 자료, changeset)는
 * 모두 여기 들어야 한다. 빠지면 저장소의 같은 파일을 읽지 못해 늘 바뀐 것으로 보고 빈 PR을 연다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 */
export const COMPARED_PREFIXES = [
  TOKENS_PATH,
  `${ASSETS_DIR}/`,
  `${COMPONENTS_DIR}/`,
  `${CHANGESET_DIR}/`,
] as const;

/** 플러그인이 쓰는 자산 묶음 폴더(`AssetRef.file`의 앞마디) */
const assetGroupFolders: readonly string[] = ['icons', 'shapes', 'illustrations', 'images'];
/**
 * 플러그인이 쓰는 자산 원본의 확장자. WebP는 생성기가 래스터 원본에서 같은 이름으로 만드는 파일이라 지우지 않는다.
 * @codocs [[디자인 시스템:자산]]
 */
const assetSourceExtensions: readonly string[] = ['svg', 'png', 'jpg', 'jpeg', 'gif'];

/**
 * 트리 변경 계획.
 * - entries: 트리 항목(바뀐 파일과 지울 파일)
 * - changed: 새로 생기거나 내용이 바뀐 파일 경로. 이 파일만 blob으로 올린다
 * - deleted: 지울 파일 경로
 */
export type TreePlan = {
  entries: TreeEntry[];
  changed: string[];
  deleted: string[];
};

/**
 * 저장소에서 읽어 비교하는 파일인지 본다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param path 저장소 경로
 * @returns 비교 범위 안이면 true
 */
export function isComparedPath(path: string): boolean {
  return COMPARED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

/**
 * 쓸 파일 가운데 브랜치와 SHA가 다른 것만 바꾸고, 이 커밋이 맡은 파일 가운데 쓸 파일에 없는 것은 지운다.
 * 맡지 않은 파일은 지우지 않는다(다른 대상의 파일과 생성 파일을 건드리지 않는다).
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param desired 쓸 파일 경로 → blob SHA
 * @param current 커밋할 브랜치의 파일 경로 → blob SHA
 * @param isOwned 이 커밋이 맡아 사라지면 지우는 파일인지
 * @returns 트리 변경 계획
 */
export function planTree(
  desired: ReadonlyMap<string, string>,
  current: ReadonlyMap<string, string>,
  isOwned: (path: string) => boolean = () => false,
): TreePlan {
  const changed = [...desired]
    .filter(([path, sha]) => current.get(path) !== sha)
    .map(([path]) => path)
    .sort();
  const deleted = [...current.keys()].filter((path) => !desired.has(path) && isOwned(path)).sort();
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
 * 자산 PR이 맡는 자산 원본 파일인지 본다. 묶음 폴더 바로 아래의 SVG·래스터 원본이다.
 * 자산 PR은 자산을 모두 내보내므로, 피그마에서 지웠거나 래스터 원본의 형식이 바뀐(확장자만 다른) 예전 원본은 지운다.
 * 생성 파일(`asset-data.ts`, `image-data.ts`, WebP)은 맡지 않는다.
 * @codocs [[디자인 시스템:자산]]
 * @param path 저장소 경로
 * @returns 자산 원본이면 true
 */
export function isAssetSourcePath(path: string): boolean {
  if (!path.startsWith(`${ASSETS_DIR}/`)) {
    return false;
  }
  const [group, file, ...rest] = path.slice(ASSETS_DIR.length + 1).split('/');
  if (group === undefined || file === undefined || rest.length > 0) {
    return false;
  }
  const dot = file.lastIndexOf('.');
  const extension = dot < 0 ? '' : file.slice(dot + 1).toLowerCase();
  return assetGroupFolders.includes(group) && assetSourceExtensions.includes(extension);
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

/**
 * 트리 항목을 정해진 수씩 나눈다. 큰 트리를 한 번에 만들면 GitHub가 422로 거절하므로,
 * 나눈 묶음마다 앞 트리를 기준으로 트리를 이어 만든다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param entries 트리 항목
 * @param size 묶음 하나의 최대 항목 수
 * @returns 나눈 묶음(항목이 없으면 빈 배열)
 */
export function treeChunks<T>(entries: readonly T[], size: number = TREE_CHUNK_SIZE): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < entries.length; start += size) {
    result.push(entries.slice(start, start + size));
  }
  return result;
}
