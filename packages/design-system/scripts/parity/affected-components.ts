/**
 * PR에서 바뀐 파일로 비교할 컴포넌트를 고른다. git을 부르지 않는 순수 함수만 둔다.
 * 파일 내용(기준 커밋과 지금)은 부르는 쪽이 읽어 넘긴다.
 */

import { cssNamesOf, type FigmaTokens, readFigmaTokens } from './figma-tokens.ts';

/** 비교 범위 */
export type AffectedSelection =
  | {
      all: true;
      /** 전체로 정한 이유(파일 경로와 설명) */
      reason: string;
      /** 비교 도구를 확인하는 증명 테스트를 돌릴지 */
      proof: boolean;
    }
  | { all: false; components: Set<string> };

/** 바뀐 파일의 기준 커밋 내용과 지금 내용. 없는 쪽은 undefined */
export type FileChange = { before: string | undefined; after: string | undefined };

/** 범위 계산에 필요한 저장소 상태 */
export type AffectedInputs = {
  /** 저장소 기준 경로 목록(`packages/design-system/src/...`) */
  changedFiles: readonly string[];
  /** 저장소 기준 패키지 경로(`packages/design-system/`) */
  packagePrefix: string;
  /** 컴포넌트 → 그 컴포넌트를 import하는 컴포넌트 목록 */
  dependents: ReadonlyMap<string, readonly string[]>;
  /** 컴포넌트 폴더 이름 → 지금의 export.json(파싱한 값) */
  exports: ReadonlyMap<string, unknown>;
  /** 지금의 figma/tokens.json(파싱한 값). 없으면 undefined */
  tokensJson: unknown;
  /** 저장소 기준 경로의 기준 커밋 내용과 지금 내용을 읽는다 */
  readChange: (file: string) => FileChange;
};

// 저장소 기준 경로다. 이 파일이 바뀌면 모든 컴포넌트에 영향을 준다고 본다.
const GLOBAL_REPO_FILE_PATTERN = /^(pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.base\.json)$/u;
// 저장소 기준 경로다. 일치 검사 워크플로가 바뀌면 전체와 증명 테스트를 돌린다.
export const PARITY_WORKFLOW_FILE = '.github/workflows/figma-parity.yml';
// 패키지 기준 경로다. 비교 도구가 바뀌면 전체와 증명 테스트를 돌린다.
const PARITY_TOOL_PATTERN = /^scripts\/(parity\/.*|package-paths\.ts)$/u;
const COMPONENT_FILE_PATTERN = /^src\/components\/([^/]+)\/(.+)$/u;
const FIGMA_COMPONENT_PATTERN = /^figma\/components\/([^/]+)\//u;
const FIGMA_ASSET_PATTERN = /^figma\/assets\/(.+)$/u;
const ASSET_DATA_FILE = 'src/assets/asset-data.ts';
const SOURCE_ASSET_PATTERN = /^src\/assets\/(.+)$/u;
// 자산 생성기가 이미지 칠 층의 불투명도를 미리 넣어 만든 파일(`noise-acrylic.opacity-2.png`)이다.
const OPACITY_SUFFIX_PATTERN = /\.opacity-[\d.]+(\.png)$/u;
const TOKENS_JSON_FILE = 'figma/tokens.json';
const TOKENS_CSS_FILE = 'src/tokens.css';
// 전역 스타일·설정이다. theme.css, fonts.css, 웹 폰트 CSS(`src/*.css`), Storybook 설정, 패키지 설정, figma.json(배율)
const GLOBAL_FILE_PATTERN =
  /^(src\/[^/]+\.css|\.storybook\/.*|package\.json|tsconfig\.json|figma\/figma\.json)$/u;
const NON_RENDERING_FILE_PATTERN = /\.(test|fixture)\.tsx?$/u;
const RELATIVE_COMPONENT_IMPORT = /from\s+['"]\.\.\/([^/'"]+)\//gu;
// asset-data.ts에서 자산 하나가 시작하는 줄(`  'icons/x.svg': {`)이다.
const ASSET_DATA_ENTRY = /^ {2}'([^']+)': \{$/u;
// tokens.json에서 다른 토큰을 가리키는 별칭(`{color.gray.f9f9f9}`)이다.
const ALIAS_REFERENCE = /\{([^{}"]+)\}/gu;
const CSS_VARIABLE_REFERENCE = /var\((--[a-z0-9-]+)/gu;

/** 파일 하나가 정한 범위 */
type FileScope =
  | { kind: 'none' }
  | { kind: 'all'; reason: string; proof: boolean }
  | { kind: 'components'; components: Iterable<string> };

/**
 * 바뀐 파일 목록에서 비교할 컴포넌트를 고른다. 파일마다 표의 위에서부터 먼저 맞는 규칙을 쓰고,
 * 모은 컴포넌트에 그것을 담는 컴포넌트를 더한다. 하나라도 전체면 전체다.
 * @codocs [[피그마 일치 검사:비교 범위]]
 * @param inputs 바뀐 파일과 저장소 상태
 * @returns 전체 비교 여부와 이유, 또는 비교할 컴포넌트 집합
 */
export function selectAffectedComponents(inputs: AffectedInputs): AffectedSelection {
  const direct = new Set<string>();
  let all: { reason: string; proof: boolean } | undefined;
  for (const file of inputs.changedFiles) {
    const scope = fileScope(file, inputs);
    if (scope.kind === 'all') {
      if (all === undefined || (scope.proof && !all.proof)) {
        all = { reason: scope.reason, proof: scope.proof };
      }
    } else if (scope.kind === 'components') {
      for (const component of scope.components) {
        direct.add(component);
      }
    }
  }
  if (all !== undefined) {
    return { all: true, ...all };
  }
  return { all: false, components: withDependents(direct, inputs.dependents) };
}

/**
 * 파일 하나의 범위를 정한다([[피그마 일치 검사:비교 범위]]의 표).
 * @param file 저장소 기준 경로
 * @param inputs 저장소 상태
 * @returns 범위
 */
function fileScope(file: string, inputs: AffectedInputs): FileScope {
  if (file === PARITY_WORKFLOW_FILE) {
    return { kind: 'all', reason: `${file}(일치 검사 워크플로)`, proof: true };
  }
  if (GLOBAL_REPO_FILE_PATTERN.test(file)) {
    return { kind: 'all', reason: file, proof: false };
  }
  if (!file.startsWith(inputs.packagePrefix)) {
    return { kind: 'none' };
  }
  const relative = file.slice(inputs.packagePrefix.length);
  if (PARITY_TOOL_PATTERN.test(relative)) {
    return { kind: 'all', reason: `${file}(비교 도구)`, proof: true };
  }
  const component = COMPONENT_FILE_PATTERN.exec(relative);
  if (component?.[1] !== undefined && component[2] !== undefined) {
    return NON_RENDERING_FILE_PATTERN.test(component[2])
      ? { kind: 'none' }
      : { kind: 'components', components: [component[1]] };
  }
  const figmaComponent = FIGMA_COMPONENT_PATTERN.exec(relative);
  if (figmaComponent?.[1] !== undefined) {
    // 플러그인이 쓴 컴포넌트 폴더(export.json, 변형 PNG)가 바뀐 컴포넌트다.
    return { kind: 'components', components: [figmaComponent[1]] };
  }
  const figmaAsset = FIGMA_ASSET_PATTERN.exec(relative);
  if (figmaAsset?.[1] !== undefined) {
    return assetScope([figmaAsset[1]], inputs);
  }
  if (relative === ASSET_DATA_FILE) {
    const change = inputs.readChange(file);
    const assets = changedAssetDataEntries(change.before, change.after);
    return assets === undefined
      ? { kind: 'all', reason: `${file}(바뀐 자산을 정하지 못함)`, proof: false }
      : assetScope(assets, inputs);
  }
  const sourceAsset = SOURCE_ASSET_PATTERN.exec(relative);
  if (sourceAsset?.[1] !== undefined) {
    return assetScope([sourceAsset[1].replace(OPACITY_SUFFIX_PATTERN, '$1')], inputs);
  }
  if (relative === TOKENS_JSON_FILE || relative === TOKENS_CSS_FILE) {
    return tokenFileScope(file, relative === TOKENS_JSON_FILE, inputs);
  }
  if (GLOBAL_FILE_PATTERN.test(relative)) {
    return { kind: 'all', reason: file, proof: false };
  }
  if (relative.startsWith('src/') && !NON_RENDERING_FILE_PATTERN.test(relative)) {
    // 컴포넌트 폴더 밖의 소스(공용 함수 등)는 어느 컴포넌트가 쓰는지 따라가지 않고 전체를 비교한다.
    return { kind: 'all', reason: file, proof: false };
  }
  return { kind: 'none' };
}

/**
 * 자산을 쓰는 컴포넌트를 찾는다. export.json의 `asset`이 그 파일을 가리키는 컴포넌트와,
 * 그 자산을 이미지 층으로 쓰는 토큰(재질 칠 스타일 등)을 쓰는 컴포넌트다.
 * @param assets figma/assets 기준 자산 경로(`icons/x.svg`)
 * @param inputs 저장소 상태
 * @returns 범위
 */
function assetScope(assets: readonly string[], inputs: AffectedInputs): FileScope {
  const wanted = new Set(assets);
  const components = [...inputs.exports]
    .filter(([, manifest]) => [...stringsIn(manifest)].some((value) => wanted.has(value)))
    .map(([component]) => component);
  const tokens = tokenEntries(inputs.tokensJson);
  if (tokens === undefined) {
    return { kind: 'components', components };
  }
  const users = [...tokens]
    .filter(([, token]) => [...stringsIn(token.value)].some((value) => wanted.has(value)))
    .map(([name]) => name);
  return {
    kind: 'components',
    components: [...components, ...tokenUsers(users, tokens, inputs.exports)],
  };
}

/**
 * tokens.json이나 tokens.css 변경에서 바뀐 토큰을 쓰는 컴포넌트를 찾는다. 정할 수 없으면 전체다.
 * @param file 저장소 기준 경로
 * @param isJson tokens.json이면 true, tokens.css면 false
 * @param inputs 저장소 상태
 * @returns 범위
 */
function tokenFileScope(file: string, isJson: boolean, inputs: AffectedInputs): FileScope {
  const change = inputs.readChange(file);
  const tokens = tokenEntries(inputs.tokensJson);
  const changed = isJson
    ? changedTokensJson(change.before, change.after)
    : changedTokensCss(change.before, change.after, inputs.tokensJson);
  if (changed === undefined || tokens === undefined) {
    return { kind: 'all', reason: `${file}(바뀐 토큰을 이름으로 정하지 못함)`, proof: false };
  }
  return { kind: 'components', components: tokenUsers(changed, tokens, inputs.exports) };
}

/** tokens.json의 토큰 하나(변수나 스타일) */
type TokenEntry = { value: unknown; references: string[] };

/**
 * tokens.json을 이름 → 토큰 표로 펼친다. 변수는 경로(`text-fill/primary`), 스타일은 종류 아래 경로
 * (`Elevation/Flyout`)가 이름이다. export.json이 같은 이름으로 가리킨다.
 * @param json tokens.json을 파싱한 값
 * @returns 토큰 표. 읽을 수 없으면 undefined
 */
function tokenEntries(json: unknown): Map<string, TokenEntry> | undefined {
  if (!isRecord(json)) {
    return undefined;
  }
  const { style, ...groups } = json;
  const entries = new Map<string, TokenEntry>();
  flattenTokens(groups, [], entries);
  if (isRecord(style)) {
    for (const kind of Object.values(style)) {
      if (isRecord(kind)) {
        flattenTokens(kind, [], entries);
      }
    }
  }
  return entries;
}

/**
 * 그룹을 따라 내려가며 `$value`를 가진 토큰을 모은다.
 * @param group 토큰 그룹
 * @param prefix 지금까지의 경로
 * @param entries 모을 곳
 */
function flattenTokens(
  group: Record<string, unknown>,
  prefix: readonly string[],
  entries: Map<string, TokenEntry>,
): void {
  for (const [key, child] of Object.entries(group)) {
    if (key.startsWith('$') || !isRecord(child)) {
      continue;
    }
    const path = [...prefix, key];
    if (!('$value' in child)) {
      flattenTokens(child, path, entries);
      continue;
    }
    const text = JSON.stringify(child);
    entries.set(path.join('/'), {
      value: child,
      references: [...text.matchAll(ALIAS_REFERENCE)].map((match) =>
        (match[1] ?? '').split('.').join('/'),
      ),
    });
  }
}

/**
 * 두 tokens.json 사이에 더해지거나 바뀌거나 사라진 토큰 이름을 구한다.
 * @param before 기준 커밋의 내용
 * @param after 지금 내용
 * @returns 바뀐 토큰 이름. 정할 수 없으면 undefined
 */
export function changedTokensJson(
  before: string | undefined,
  after: string | undefined,
): string[] | undefined {
  const old = tokenEntries(parseJson(before ?? '{}'));
  const now = tokenEntries(parseJson(after ?? '{}'));
  if (old === undefined || now === undefined) {
    return undefined;
  }
  return [...new Set([...old.keys(), ...now.keys()])].filter(
    (name) =>
      JSON.stringify(old.get(name)?.value) !== JSON.stringify(now.get(name)?.value) ||
      !old.has(name) ||
      !now.has(name),
  );
}

/**
 * 두 tokens.css 사이에 바뀐 `@theme` 변수와 `@utility`를 피그마 토큰 이름으로 바꾼다.
 * 다른 CSS 변수를 거쳐 바뀐 변수도 따라간다. 피그마 토큰으로 바꿀 수 없는 변경이 하나라도 있으면 정할 수 없다.
 * @param before 기준 커밋의 내용
 * @param after 지금 내용
 * @param tokensJson 지금의 tokens.json(파싱한 값)
 * @returns 바뀐 토큰 이름. 정할 수 없으면 undefined
 */
export function changedTokensCss(
  before: string | undefined,
  after: string | undefined,
  tokensJson: unknown,
): string[] | undefined {
  if (before === undefined || after === undefined) {
    return undefined;
  }
  const old = cssBlocks(before);
  const now = cssBlocks(after);
  if (old.rest !== now.rest) {
    return undefined;
  }
  const changedVariables = new Set(
    [...new Set([...old.theme.keys(), ...now.theme.keys()])].filter(
      (name) => old.theme.get(name) !== now.theme.get(name),
    ),
  );
  // 바뀐 변수를 var()로 가리키는 변수도 값이 바뀐다.
  for (let hasGrown = true; hasGrown;) {
    hasGrown = false;
    for (const [name, value] of now.theme) {
      if (
        !changedVariables.has(name) &&
        [...value.matchAll(CSS_VARIABLE_REFERENCE)].some((match) =>
          changedVariables.has(match[1] ?? ''),
        )
      ) {
        changedVariables.add(name);
        hasGrown = true;
      }
    }
  }
  const changedUtilities = [...new Set([...old.utilities.keys(), ...now.utilities.keys()])].filter(
    (name) => old.utilities.get(name) !== now.utilities.get(name),
  );
  const names = cssTokenNames(tokensJson);
  if (names === undefined) {
    return undefined;
  }
  const found = new Set<string>();
  for (const variable of changedVariables) {
    const token = names.variables.get(variable);
    if (token === undefined) {
      return undefined;
    }
    found.add(token);
  }
  for (const utility of changedUtilities) {
    const tokens = utilityTokens(utility, old, now, names);
    if (tokens === undefined) {
      return undefined;
    }
    for (const token of tokens) {
      found.add(token);
    }
  }
  return [...found];
}

/**
 * 바뀐 `@utility` 하나가 나타내는 피그마 토큰을 정한다. 글자 스타일·재질 유틸리티는 그 스타일이고,
 * 나머지는 본문이 가리키는 변수의 토큰이다.
 * @param utility 유틸리티 이름
 * @param old 기준 커밋의 tokens.css
 * @param now 지금 tokens.css
 * @param names CSS 이름 → 피그마 토큰 이름
 * @returns 토큰 이름. 정할 수 없으면 undefined
 */
function utilityTokens(
  utility: string,
  old: CssBlocks,
  now: CssBlocks,
  names: CssTokenNames,
): string[] | undefined {
  const style = names.utilities.get(utility);
  if (style !== undefined) {
    return [style];
  }
  const bodies = `${old.utilities.get(utility) ?? ''}\n${now.utilities.get(utility) ?? ''}`;
  const variables = [...bodies.matchAll(CSS_VARIABLE_REFERENCE)].map((match) => match[1] ?? '');
  const tokens = variables.map((variable) => names.variables.get(variable));
  if (tokens.length === 0 || tokens.some((token) => token === undefined)) {
    return undefined;
  }
  return tokens.filter((token): token is string => token !== undefined);
}

/** CSS 이름 → 피그마 토큰 이름 */
type CssTokenNames = {
  /** `--color-text-fill-primary` → `text-fill/primary` */
  variables: Map<string, string>;
  /** `type-body-strong` → `Body Strong`, `material-acrylic-default` → `Material/Acrylic Default` */
  utilities: Map<string, string>;
};

/**
 * 이름 규칙으로 CSS 이름에서 피그마 토큰 이름을 찾는 표를 만든다.
 * @codocs [[피그마 일치 검사:토큰 작성]]
 * @param tokensJson tokens.json(파싱한 값)
 * @returns 표. tokens.json을 읽을 수 없으면 undefined
 */
function cssTokenNames(tokensJson: unknown): CssTokenNames | undefined {
  let tokens: FigmaTokens;
  try {
    tokens = readFigmaTokens(tokensJson);
  } catch {
    return undefined;
  }
  const variables = new Map<string, string>();
  const utilities = new Map<string, string>();
  for (const path of tokens.variables.keys()) {
    for (const name of cssNamesOf(tokens, path)) {
      variables.set(name, path);
    }
  }
  for (const [name, paint] of tokens.paints) {
    if (paint.kind === 'material') {
      utilities.set(paint.utility, name);
    } else {
      variables.set(paint.cssName, name);
    }
  }
  for (const [name, effect] of tokens.effects) {
    for (const cssName of [effect.shadow?.cssName, effect.backdropBlur, effect.blur]) {
      if (typeof cssName === 'string') {
        variables.set(cssName, name);
      }
    }
  }
  for (const [name, utility] of tokens.texts) {
    // 한글 스타일은 라틴 스타일과 같은 유틸리티라 라틴 스타일 이름을 남긴다.
    if (!utilities.has(utility) || !name.includes('/')) {
      utilities.set(utility, name);
    }
  }
  return { variables, utilities };
}

/**
 * 바뀐 토큰과 그것을 별칭으로 가리키는 토큰(끝까지)을 쓰는 컴포넌트를 찾는다.
 * @param changed 바뀐 토큰 이름
 * @param tokens 지금의 토큰 표
 * @param exports 컴포넌트 → export.json
 * @returns 컴포넌트
 */
function tokenUsers(
  changed: readonly string[],
  tokens: ReadonlyMap<string, TokenEntry>,
  exports: ReadonlyMap<string, unknown>,
): string[] {
  const affected = new Set(changed);
  for (let hasGrown = true; hasGrown;) {
    hasGrown = false;
    for (const [name, token] of tokens) {
      if (!affected.has(name) && token.references.some((reference) => affected.has(reference))) {
        affected.add(name);
        hasGrown = true;
      }
    }
  }
  // 한글 글자 스타일(`Hangul/Body`)은 라틴 스타일과 같은 변수를 쓴다. 어느 쪽이 바뀌어도 둘을 함께 본다.
  for (const name of [...affected]) {
    affected.add(name.startsWith('Hangul/') ? name.slice('Hangul/'.length) : `Hangul/${name}`);
  }
  return [...exports]
    .filter(([, manifest]) => [...stringsIn(manifest)].some((value) => affected.has(value)))
    .map(([component]) => component);
}

/** tokens.css를 나눈 결과 */
type CssBlocks = {
  /** `@theme` 사용자 속성 이름 → 값 */
  theme: Map<string, string>;
  /** `@utility` 이름 → 본문 */
  utilities: Map<string, string>;
  /** 두 블록과 주석을 뺀 나머지(공백 정리) */
  rest: string;
};

/**
 * tokens.css를 `@theme` 변수, `@utility` 본문, 나머지로 나눈다.
 * @param css tokens.css 내용
 * @returns 나눈 결과
 */
function cssBlocks(css: string): CssBlocks {
  const text = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const theme = new Map<string, string>();
  const utilities = new Map<string, string>();
  let rest = '';
  let cursor = 0;
  for (const match of text.matchAll(/@(theme|utility)([^{]*)\{/gu)) {
    if (match.index < cursor) {
      continue;
    }
    const start = match.index + match[0].length;
    const end = blockEnd(text, start);
    const body = text.slice(start, end);
    rest += text.slice(cursor, match.index);
    cursor = end + 1;
    if (match[1] === 'utility') {
      utilities.set((match[2] ?? '').trim(), body.replace(/\s+/gu, ' ').trim());
      continue;
    }
    for (const declaration of body.split(';')) {
      const separator = declaration.indexOf(':');
      const name = declaration.slice(0, separator).trim();
      if (separator >= 0 && name.startsWith('--')) {
        theme.set(
          name,
          declaration
            .slice(separator + 1)
            .replace(/\s+/gu, ' ')
            .trim(),
        );
      }
    }
  }
  rest += text.slice(cursor);
  return { theme, utilities, rest: rest.replace(/\s+/gu, ' ').trim() };
}

/**
 * 여는 중괄호 바로 뒤에서 시작해 짝이 맞는 닫는 중괄호의 위치를 찾는다.
 * @param text CSS
 * @param start 여는 중괄호 다음 위치
 * @returns 닫는 중괄호 위치(없으면 글자 끝)
 */
function blockEnd(text: string, start: number): number {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') {
      depth += 1;
    } else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return text.length;
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
    if (entry?.[1] !== undefined || !line.startsWith(' ')) {
      if (current !== undefined) {
        entries.set(current.name, current.lines.join('\n'));
        current = undefined;
      }
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

/**
 * 값 안의 문자열을 모두 모은다(export.json에서 토큰 이름과 자산 경로를 찾을 때 쓴다).
 * @param value JSON 값
 * @returns 문자열 집합
 */
function stringsIn(value: unknown): Set<string> {
  const found = new Set<string>();
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const next = stack.pop();
    if (typeof next === 'string') {
      found.add(next);
    } else if (Array.isArray(next)) {
      stack.push(...(next as unknown[]));
    } else if (isRecord(next)) {
      stack.push(...Object.values(next));
    }
  }
  return found;
}

/**
 * JSON을 읽는다.
 * @param text JSON 글자
 * @returns 파싱한 값. 읽을 수 없으면 undefined
 */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * 객체인지 본다.
 * @param value 값
 * @returns 배열이 아닌 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
