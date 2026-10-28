import { componentSlug, patternFolder, patternPlace } from './naming';
import { COMPONENTS_DIR, MOTIONS_DIR } from './plugin-config';

// 저장소 `main`의 파일 목록으로 대상 목록의 "새로 만듦"을 정하는 순수 계산이다.

/** 상태를 볼 대상 */
export type StatusTargets = {
  components: readonly { id: string; name: string }[];
  patterns: readonly { id: string; name: string }[];
  motions: readonly { id: string; name: string }[];
};

/**
 * 저장소에 대상 폴더(애니메이션은 `figma/motions/<이름>.json`)가 없는 대상을 찾는다.
 * 파일 목록은 트리를 한 번 읽어 얻어, 대상마다 GitHub API를 부르지 않는다.
 * 이름으로 폴더를 정할 수 없는 대상(영문이 없는 이름, `영역/이름` 꼴이 아닌 조립)은 저장소에 있을 수 없어 새로 만듦으로 본다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param paths 저장소 `main`의 파일 경로
 * @param targets 컴포넌트·조립·애니메이션
 * @returns 새로 만드는 대상의 노드 ID
 */
export function newTargetIds(paths: Iterable<string>, targets: StatusTargets): string[] {
  const files = [...paths];
  /**
   * 폴더 아래에 파일이 하나라도 있는지 본다.
   * @param folder 저장소 폴더
   * @returns 있으면 true
   */
  function hasFolder(folder: string): boolean {
    return files.some((path) => path.startsWith(`${folder}/`));
  }
  const ids: string[] = [];
  for (const { id, name } of targets.components) {
    const slug = safeSlug(name);
    if (slug === null || !hasFolder(`${COMPONENTS_DIR}/${slug}`)) {
      ids.push(id);
    }
  }
  for (const { id, name } of targets.patterns) {
    const place = safePlace(name);
    if (place === null || !hasFolder(patternFolder(place))) {
      ids.push(id);
    }
  }
  for (const { id, name } of targets.motions) {
    if (!files.includes(`${MOTIONS_DIR}/${name}.json`)) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * 컴포넌트 폴더 이름을 구한다.
 * @param name 컴포넌트 이름
 * @returns 폴더 이름, 정할 수 없으면 null
 */
function safeSlug(name: string): string | null {
  try {
    return componentSlug(name);
  } catch {
    return null;
  }
}

/**
 * 조립의 영역과 이름 폴더를 구한다.
 * @param name 조립 이름
 * @returns 영역과 이름, 정할 수 없으면 null
 */
function safePlace(name: string): ReturnType<typeof patternPlace> {
  try {
    return patternPlace(name);
  } catch {
    return null;
  }
}
