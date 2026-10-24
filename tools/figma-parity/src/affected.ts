/**
 * PR에서 바뀐 파일로 캡처할 컴포넌트와 조립을 고른다. git과 파일을 읽지 않는 순수 함수만 둔다.
 * 파일 내용과 소스는 부르는 쪽(run-capture.ts)이 읽어 넘긴다.
 */

import { changedTokenUsage, usesTokens } from './tokens-scope.ts';

/** 캡처 범위 */
export type AffectedSelection =
  | {
      all: true;
      /** 전체로 정한 이유(파일 경로와 설명) */
      reason: string;
    }
  | {
      all: false;
      /** 컴포넌트 폴더 이름 */
      components: Set<string>;
      /** 조립 이름(`Menu/Folder`) */
      patterns: Set<string>;
    };

/** 바뀐 파일의 기준 커밋 내용과 지금 내용. 없는 쪽은 undefined */
export type FileChange = { before: string | undefined; after: string | undefined };

/** 조립 하나의 코드 */
export type PatternCode = {
  /** 조립 스토리 파일과 그 스토리가 import하는 앱 파일(저장소 기준) */
  files: ReadonlySet<string>;
  /** 그 파일들의 내용 */
  sources: readonly string[];
  /** 그 파일들이 `@seojaewan/design-system`에서 가져다 쓰는 컴포넌트 폴더 이름 */
  components: ReadonlySet<string>;
};

/** 범위 계산에 필요한 저장소 상태 */
export type AffectedInputs = {
  /** 저장소 기준 경로 목록 */
  changedFiles: readonly string[];
  /** 컴포넌트 폴더 이름 → 그 폴더의 소스 내용(테스트 제외, 스토리 포함) */
  componentSources: ReadonlyMap<string, readonly string[]>;
  /** 조립 이름 → 조립 코드 */
  patterns: ReadonlyMap<string, PatternCode>;
  /** 조립 이름 → 피그마 그림 폴더의 영역(`menu`) */
  patternAreas: ReadonlyMap<string, string>;
  /** 저장소 기준 경로의 기준 커밋 내용과 지금 내용을 읽는다 */
  readChange: (file: string) => FileChange;
};

const DESIGN_SYSTEM = 'packages/design-system/';
const WEB = 'apps/web/';
// 캡처 도구와 워크플로가 바뀌면 전체를 캡처한다.
export const CAPTURE_WORKFLOW_FILE = '.github/workflows/figma-parity.yml';
const CAPTURE_TOOL_PREFIX = 'tools/figma-parity/';
// 저장소 기준 경로다. 이 파일이 바뀌면 모든 대상에 영향을 준다고 본다.
const GLOBAL_REPO_FILE_PATTERN = /^(pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.base\.json)$/u;
const NON_RENDERING_FILE_PATTERN = /\.(test|fixture)\.tsx?$/u;
// 디자인 시스템 패키지 기준 경로다.
const COMPONENT_FILE_PATTERN = /^src\/components\/([^/]+)\//u;
const FIGMA_COMPONENT_PATTERN = /^figma\/components\/([^/]+)\//u;
const FIGMA_ASSET_PATTERN = /^figma\/assets\/(.+)$/u;
// 공개 진입점이다. 컴포넌트 파일을 다시 내보내기만 하므로 그리는 모습에 영향이 없다.
const ENTRY_FILE = 'src/index.ts';
const ASSET_DATA_FILE = 'src/assets/asset-data.ts';
const SOURCE_ASSET_PATTERN = /^src\/assets\/(.+)$/u;
const tokenFiles = new Set(['figma/tokens.json', 'src/tokens.css']);
const TOKENS_CSS_FILE = `${DESIGN_SYSTEM}src/tokens.css`;
// 전역 스타일·설정이다. figma.json(배율), Storybook 설정, 패키지 설정
const GLOBAL_PACKAGE_FILE_PATTERN =
  /^(figma\/figma\.json|\.storybook\/.*|package\.json|tsconfig\.json)$/u;
// 앱 기준 경로다.
const FIGMA_PATTERN_AREA_PATTERN = /^figma\/patterns\/([^/]+)\//u;
const RELATIVE_COMPONENT_IMPORT = /from\s+['"]\.\.\/([^/'"]+)\//gu;
// asset-data.ts에서 자산 하나가 시작하는 줄(`  'icons/x.svg': {`)이다.
const ASSET_DATA_ENTRY = /^ {2}'([^']+)': \{$/u;

/** 파일 하나가 정한 범위 */
type FileScope =
  | { kind: 'none' }
  | { kind: 'all'; reason: string }
  | {
      kind: 'some';
      /** 그것을 담는 컴포넌트와 쓰는 조립까지 넓힐 컴포넌트 */
      components?: Iterable<string>;
      /** 그것을 담는 컴포넌트까지만 넓힐 컴포넌트(피그마 그림만 바뀜) */
      figmaComponents?: Iterable<string>;
      patterns?: Iterable<string>;
    };

/**
 * 바뀐 파일 목록에서 캡처할 컴포넌트와 조립을 고른다. 파일마다 표의 위에서부터 먼저 맞는 규칙을 쓰고,
 * 모은 컴포넌트에 그것을 담는 컴포넌트와 그것을 쓰는 조립을 더한다. 하나라도 전체면 전체다.
 * @codocs [[피그마 연동:캡처 범위]]
 * @param inputs 바뀐 파일과 저장소 상태
 * @returns 전체 캡처 여부와 이유, 또는 캡처할 컴포넌트와 조립
 */
export function selectAffected(inputs: AffectedInputs): AffectedSelection {
  const components = new Set<string>();
  const figmaComponents = new Set<string>();
  const patterns = new Set<string>();
  for (const file of inputs.changedFiles) {
    const scope = fileScope(file, inputs);
    if (scope.kind === 'all') {
      return { all: true, reason: scope.reason };
    }
    if (scope.kind === 'some') {
      for (const component of scope.components ?? []) {
        components.add(component);
      }
      for (const component of scope.figmaComponents ?? []) {
        figmaComponents.add(component);
      }
      for (const pattern of scope.patterns ?? []) {
        patterns.add(pattern);
      }
    }
  }
  const dependents = componentDependents(inputs.componentSources);
  const rendered = withDependents(components, dependents);
  for (const [name, code] of inputs.patterns) {
    if ([...code.components].some((component) => rendered.has(component))) {
      patterns.add(name);
    }
  }
  return {
    all: false,
    components: new Set([...rendered, ...withDependents(figmaComponents, dependents)]),
    patterns,
  };
}

/**
 * 파일 하나의 범위를 정한다([[피그마 연동:캡처 범위]]의 표).
 * @param file 저장소 기준 경로
 * @param inputs 저장소 상태
 * @returns 범위
 */
function fileScope(file: string, inputs: AffectedInputs): FileScope {
  if (NON_RENDERING_FILE_PATTERN.test(file)) {
    return { kind: 'none' };
  }
  if (file === CAPTURE_WORKFLOW_FILE || file.startsWith(CAPTURE_TOOL_PREFIX)) {
    return { kind: 'all', reason: `${file}(캡처 도구)` };
  }
  if (GLOBAL_REPO_FILE_PATTERN.test(file)) {
    return { kind: 'all', reason: file };
  }
  if (file.startsWith(DESIGN_SYSTEM)) {
    return designSystemScope(file, file.slice(DESIGN_SYSTEM.length), inputs);
  }
  if (file.startsWith(WEB)) {
    return webScope(file, file.slice(WEB.length), inputs);
  }
  return { kind: 'none' };
}

/**
 * 디자인 시스템 패키지 파일의 범위를 정한다.
 * @param file 저장소 기준 경로
 * @param relative 패키지 기준 경로
 * @param inputs 저장소 상태
 * @returns 범위
 */
function designSystemScope(file: string, relative: string, inputs: AffectedInputs): FileScope {
  if (relative === ENTRY_FILE) {
    return { kind: 'none' };
  }
  const component = COMPONENT_FILE_PATTERN.exec(relative)?.[1];
  if (component !== undefined) {
    return { kind: 'some', components: [component] };
  }
  const figmaComponent = FIGMA_COMPONENT_PATTERN.exec(relative)?.[1];
  if (figmaComponent !== undefined) {
    return { kind: 'some', figmaComponents: [figmaComponent] };
  }
  const figmaAsset = FIGMA_ASSET_PATTERN.exec(relative)?.[1];
  if (figmaAsset !== undefined) {
    return assetScope([figmaAsset], inputs);
  }
  if (relative === ASSET_DATA_FILE) {
    const change = inputs.readChange(file);
    const assets = changedAssetDataEntries(change.before, change.after);
    return assets === undefined
      ? { kind: 'all', reason: `${file}(바뀐 자산을 정하지 못함)` }
      : assetScope(assets, inputs);
  }
  const sourceAsset = SOURCE_ASSET_PATTERN.exec(relative)?.[1];
  if (sourceAsset !== undefined) {
    return assetScope([sourceAsset], inputs);
  }
  if (tokenFiles.has(relative)) {
    return tokenScope(inputs);
  }
  if (GLOBAL_PACKAGE_FILE_PATTERN.test(relative) || relative.startsWith('src/')) {
    // 컴포넌트 폴더 밖의 소스(theme.css, 웹 폰트 CSS, 공용 함수)는 CSS로도 영향을 주므로 전체를 캡처한다.
    return { kind: 'all', reason: file };
  }
  return { kind: 'none' };
}

/**
 * 앱 파일의 범위를 정한다.
 * @param file 저장소 기준 경로
 * @param relative 앱 기준 경로
 * @param inputs 저장소 상태
 * @returns 범위
 */
function webScope(file: string, relative: string, inputs: AffectedInputs): FileScope {
  const area = FIGMA_PATTERN_AREA_PATTERN.exec(relative)?.[1];
  if (area !== undefined) {
    return {
      kind: 'some',
      patterns: [...inputs.patternAreas].filter(([, own]) => own === area).map(([name]) => name),
    };
  }
  if (GLOBAL_PACKAGE_FILE_PATTERN.test(relative)) {
    return { kind: 'all', reason: file };
  }
  return {
    kind: 'some',
    patterns: [...inputs.patterns].filter(([, code]) => code.files.has(file)).map(([name]) => name),
  };
}

/**
 * 자산을 쓰는 컴포넌트와 조립을 코드에서 자산 이름(`icons/x.svg`)으로 찾는다.
 * @param assets figma/assets 기준 자산 경로
 * @param inputs 저장소 상태
 * @returns 범위
 */
function assetScope(assets: readonly string[], inputs: AffectedInputs): FileScope {
  /**
   * 소스가 자산 이름을 쓰는지 본다.
   * @param sources 소스 내용
   * @returns 쓰면 true
   */
  function usesAsset(sources: readonly string[]): boolean {
    return sources.some((source) => assets.some((asset) => source.includes(asset)));
  }
  return {
    kind: 'some',
    components: [...inputs.componentSources]
      .filter(([, sources]) => usesAsset(sources))
      .map(([component]) => component),
    patterns: [...inputs.patterns]
      .filter(([, code]) => usesAsset(code.sources))
      .map(([name]) => name),
  };
}

/**
 * 바뀐 토큰의 클래스나 변수를 쓰는 컴포넌트와 조립을 찾는다. tokens.css의 변경으로 정하고, 정하지 못하면 전체다.
 * @param inputs 저장소 상태
 * @returns 범위
 */
function tokenScope(inputs: AffectedInputs): FileScope {
  const change = inputs.readChange(TOKENS_CSS_FILE);
  if (change.before === change.after) {
    // tokens.json만 바뀌고 tokens.css가 그대로면 화면은 바뀌지 않는다(어긋나면 토큰 검사가 실패한다).
    return { kind: 'none' };
  }
  const usage = changedTokenUsage(change.before, change.after);
  if (usage === undefined) {
    return { kind: 'all', reason: `${TOKENS_CSS_FILE}(바뀐 토큰을 정하지 못함)` };
  }
  return {
    kind: 'some',
    components: [...inputs.componentSources]
      .filter(([, sources]) => sources.some((source) => usesTokens(source, usage)))
      .map(([component]) => component),
    patterns: [...inputs.patterns]
      .filter(([, code]) => code.sources.some((source) => usesTokens(source, usage)))
      .map(([name]) => name),
  };
}

/**
 * 두 asset-data.ts 사이에 바뀐 자산 항목(`'icons/x.svg': {…}`)을 구한다.
 * @param before 기준 커밋의 내용
 * @param after 지금 내용
 * @returns figma/assets 기준 자산 경로. 항목 밖(형식 정의 등)이 바뀌었거나 읽을 수 없으면 undefined
 */
export function changedAssetDataEntries(
  before: string | undefined,
  after: string | undefined,
): string[] | undefined {
  const old = assetDataEntries(before ?? '');
  const now = assetDataEntries(after ?? '');
  if (before !== undefined && after !== undefined && old.rest !== now.rest) {
    return undefined;
  }
  return [...new Set([...old.entries.keys(), ...now.entries.keys()])].filter(
    (name) => old.entries.get(name) !== now.entries.get(name),
  );
}

/**
 * asset-data.ts를 자산 항목과 나머지로 나눈다. 항목은 두 칸 들여 쓴 `'경로': {` 줄에서 시작해
 * 다음 항목이나 들여 쓰지 않은 줄 앞에서 끝난다.
 * @param text asset-data.ts 내용
 * @returns 자산 경로 → 항목 글자, 나머지 글자
 */
function assetDataEntries(text: string): { entries: Map<string, string>; rest: string } {
  const entries = new Map<string, string>();
  const rest: string[] = [];
  let current: { name: string; lines: string[] } | undefined;
  for (const line of text.split('\n')) {
    const entry = ASSET_DATA_ENTRY.exec(line);
    if ((entry?.[1] !== undefined || !line.startsWith(' ')) && current !== undefined) {
      entries.set(current.name, current.lines.join('\n'));
      current = undefined;
    }
    if (entry?.[1] !== undefined) {
      current = { name: entry[1], lines: [] };
    } else if (current === undefined) {
      rest.push(line);
    } else {
      current.lines.push(line);
    }
  }
  if (current !== undefined) {
    entries.set(current.name, current.lines.join('\n'));
  }
  return { entries, rest: rest.join('\n') };
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
 * 컴포넌트에 그것을 담는 컴포넌트를 거슬러 올라가며 더한다.
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
