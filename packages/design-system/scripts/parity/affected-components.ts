/**
 * PR에서 바뀐 파일로 비교할 컴포넌트를 고른다. git을 부르지 않는 순수 함수만 둔다.
 */

export type AffectedSelection =
  { all: true; reason: string } | { all: false; components: Set<string> };

// 패키지 기준 경로다. 이 파일이 바뀌면 모든 컴포넌트에 영향을 준다고 본다.
const GLOBAL_FILE_PATTERN =
  /^(src\/(theme|tokens|fonts)\.css|figma\/(tokens|figma)\.json|\.storybook\/.*|package\.json|tsconfig\.json|scripts\/parity\/.*|scripts\/package-paths\.ts)$/u;
// 저장소 기준 경로다.
const GLOBAL_REPO_FILE_PATTERN = /^(pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.base\.json)$/u;
const COMPONENT_FILE_PATTERN = /^src\/components\/([^/]+)\/(.+)$/u;
const FIGMA_COMPONENT_PATTERN = /^figma\/components\/([^/]+)\//u;
const NON_RENDERING_FILE_PATTERN = /\.(test|fixture)\.tsx?$/u;
const RELATIVE_COMPONENT_IMPORT = /from\s+['"]\.\.\/([^/'"]+)\//gu;

/**
 * 바뀐 파일 목록에서 비교할 컴포넌트를 고른다.
 * @codocs [[피그마 일치 검사:비교 범위]]
 * @param changedFiles 저장소 기준 경로 목록(`packages/design-system/src/...`)
 * @param packagePrefix 저장소 기준 패키지 경로(`packages/design-system/`)
 * @param dependents 컴포넌트 → 그 컴포넌트를 import하는 컴포넌트 목록
 * @returns 전체 비교 여부와 이유, 또는 비교할 컴포넌트 집합
 */
export function selectAffectedComponents(
  changedFiles: readonly string[],
  packagePrefix: string,
  dependents: ReadonlyMap<string, readonly string[]>,
): AffectedSelection {
  const direct = new Set<string>();

  for (const file of changedFiles) {
    if (GLOBAL_REPO_FILE_PATTERN.test(file)) {
      return { all: true, reason: file };
    }
    if (!file.startsWith(packagePrefix)) {
      continue;
    }
    const relative = file.slice(packagePrefix.length);
    if (GLOBAL_FILE_PATTERN.test(relative)) {
      return { all: true, reason: file };
    }
    const component = COMPONENT_FILE_PATTERN.exec(relative);
    if (component?.[1] !== undefined && component[2] !== undefined) {
      if (!NON_RENDERING_FILE_PATTERN.test(component[2])) {
        direct.add(component[1]);
      }
      continue;
    }
    if (relative.startsWith('src/') && !NON_RENDERING_FILE_PATTERN.test(relative)) {
      // 컴포넌트 폴더 밖의 소스(공용 함수 등)는 어느 컴포넌트가 쓰는지 따라가지 않고 전체를 비교한다.
      return { all: true, reason: file };
    }
    // 플러그인이 쓴 컴포넌트 폴더(export.json, 변형 PNG, vector SVG)가 바뀐 컴포넌트다.
    const figmaComponent = FIGMA_COMPONENT_PATTERN.exec(relative);
    if (figmaComponent?.[1] !== undefined) {
      direct.add(figmaComponent[1]);
    }
  }

  return { all: false, components: withDependents(direct, dependents) };
}

/**
 * 컴포넌트 소스의 상대 import(`../menu-item/...`)로 역방향 의존 관계를 만든다.
 * @param sources 컴포넌트 폴더 이름 → 그 폴더의 소스 내용 목록
 * @returns 컴포넌트 → 그 컴포넌트를 import하는 컴포넌트 목록
 */
export function componentDependents(
  sources: ReadonlyMap<string, readonly string[]>,
): Map<string, string[]> {
  const dependents = new Map<string, string[]>();
  for (const [component, contents] of sources) {
    for (const content of contents) {
      for (const match of content.matchAll(RELATIVE_COMPONENT_IMPORT)) {
        const imported = match[1];
        if (imported === undefined || imported === component) {
          continue;
        }
        const list = dependents.get(imported) ?? [];
        if (!list.includes(component)) {
          list.push(component);
        }
        dependents.set(imported, list);
      }
    }
  }
  return dependents;
}

/**
 * 직접 바뀐 컴포넌트에 그것을 쓰는 컴포넌트를 거슬러 올라가며 더한다.
 * @param direct 직접 바뀐 컴포넌트
 * @param dependents 컴포넌트 → 그 컴포넌트를 import하는 컴포넌트 목록
 * @returns 영향받는 컴포넌트 전체
 */
function withDependents(
  direct: ReadonlySet<string>,
  dependents: ReadonlyMap<string, readonly string[]>,
): Set<string> {
  const result = new Set(direct);
  const queue = [...direct];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const dependent of dependents.get(next) ?? []) {
      if (!result.has(dependent)) {
        result.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return result;
}
