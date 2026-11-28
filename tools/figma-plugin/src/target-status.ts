import { componentSchemaPath, componentSlug } from './naming';

// 저장소 `main`의 파일 목록으로 대상 목록의 "새로 만듦"을 정하는 순수 계산이다.

/**
 * 저장소에 스키마(`src/components/<이름>/<이름>.json`)가 없는 컴포넌트를 찾는다.
 * 파일 목록은 트리를 한 번 읽어 얻어, 컴포넌트마다 GitHub API를 부르지 않는다.
 * 이름으로 폴더를 정할 수 없는 컴포넌트(영문이 없는 이름)는 저장소에 있을 수 없어 새로 만듦으로 본다.
 * @codocs [[디자인 시스템:플러그인 화면]]
 * @param paths 저장소 `main`의 파일 경로
 * @param components 컴포넌트 노드 ID와 이름
 * @returns 새로 만드는 컴포넌트의 노드 ID
 */
export function newComponentIds(
  paths: Iterable<string>,
  components: readonly { id: string; name: string }[],
): string[] {
  const files = new Set(paths);
  return components
    .filter(({ name }) => {
      const slug = safeSlug(name);
      return slug === null || !files.has(componentSchemaPath(slug));
    })
    .map(({ id }) => id);
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
