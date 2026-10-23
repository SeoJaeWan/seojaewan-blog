// main의 tokens.json과 새로 내보낸 tokens.json을 비교해 바뀐 토큰과, 그 토큰을 쓰는 컴포넌트를 찾는 순수 계산이다.
// 토큰 PR은 바뀐 토큰을 쓰는 컴포넌트의 변형 PNG를 다시 내보내는데, 그 대상을 여기서 정한다.

/** 스타일 토큰이 tokens.json에서 놓이는 그룹(`style/<종류>/<스타일 이름>`) */
const STYLE_GROUP = /^style\/(?:text|effect|paint)\//u;

/** 별칭 참조(`{color.blue.dark-1}`) */
const ALIAS_REFERENCE = /\{([^{}]+)\}/gu;

/** tokens.json 비교 결과 */
export type TokenChanges = {
  /** 값이나 종류가 바뀌었거나 새로 생기거나 사라진 토큰 경로(`color/blue/dark-1`, `style/text/Body`) */
  changedPaths: string[];
  /** main에 없던 토큰 경로 */
  addedPaths: string[];
  /** 값이나 종류가 바뀐 토큰 경로 */
  modifiedPaths: string[];
  /** main에만 있는 토큰 경로(이름이 바뀌었거나 지워진 토큰) */
  removedPaths: string[];
  /**
   * 피그마가 그 토큰을 부르는 이름. 바뀐 토큰과, 바뀐 토큰을 (거쳐서라도) 가리키는 별칭을 모두 담는다.
   * 변수는 경로 그대로(`accent-fill/default`), 스타일은 스타일 이름(`Hangul/Body`)이다.
   */
  affectedNames: Set<string>;
};

/**
 * 두 tokens.json을 비교해 바뀐 토큰과 영향받는 이름을 찾는다. `$extensions`(컬렉션, 쓰임 범위)는 모습과 관계없어 비교하지 않는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param oldText main의 tokens.json 내용(없으면 null)
 * @param newText 새로 내보낸 tokens.json 내용
 * @returns 바뀐 토큰 경로와 영향받는 이름
 */
export function tokenChanges(oldText: string | null, newText: string): TokenChanges {
  const before = flattenTokens(oldText === null ? {} : parseJson(oldText));
  const after = flattenTokens(parseJson(newText));
  const paths = new Set([...before.keys(), ...after.keys()]);
  const changedPaths = [...paths].filter((path) => before.get(path) !== after.get(path)).sort();

  const references = new Map<string, Set<string>>();
  for (const path of paths) {
    references.set(
      path,
      new Set([...aliasTargets(before.get(path)), ...aliasTargets(after.get(path))]),
    );
  }
  const affected = new Set(changedPaths);
  let isGrowing = true;
  while (isGrowing) {
    isGrowing = false;
    for (const [path, targets] of references) {
      if (!affected.has(path) && [...targets].some((target) => affected.has(target))) {
        affected.add(path);
        isGrowing = true;
      }
    }
  }
  return {
    changedPaths,
    addedPaths: changedPaths.filter((path) => !before.has(path)),
    modifiedPaths: changedPaths.filter((path) => before.has(path) && after.has(path)),
    removedPaths: changedPaths.filter((path) => !after.has(path)),
    affectedNames: new Set([...affected].map((path) => path.replace(STYLE_GROUP, ''))),
  };
}

/**
 * 쓰는 토큰 이름 목록 가운데 하나라도 바뀐 토큰을 쓰는 컴포넌트를 찾는다.
 * 쓰는 토큰은 피그마에서 컴포넌트의 모든 레이어(인스턴스 안쪽 포함)에 연결된 변수와 스타일 이름이다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param usages 컴포넌트 이름 → 쓰는 토큰 이름(변수 경로, 스타일 이름)
 * @param names 찾을 토큰 이름
 * @returns 그 토큰을 쓰는 컴포넌트 이름(정렬)
 */
export function componentsUsingTokens(
  usages: ReadonlyMap<string, ReadonlySet<string>>,
  names: ReadonlySet<string>,
): string[] {
  return [...usages]
    .filter(([, used]) => [...used].some((name) => names.has(name)))
    .map(([component]) => component)
    .sort();
}

/**
 * 토큰 트리를 경로 → 비교용 문자열(`$type`, `$value`)로 펼친다.
 * @param value 토큰 트리
 * @param prefix 지금까지의 경로
 * @param out 결과
 * @returns 경로(`/`로 이음) → 비교용 문자열
 */
function flattenTokens(
  value: unknown,
  prefix: readonly string[] = [],
  out = new Map<string, string>(),
): Map<string, string> {
  if (!isRecord(value)) {
    return out;
  }
  if ('$value' in value) {
    out.set(prefix.join('/'), JSON.stringify([stableJson(value.$type), stableJson(value.$value)]));
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === '$root') {
      // 그룹 자신의 토큰은 피그마에서 그룹과 같은 이름의 변수다.
      flattenTokens(child, prefix, out);
    } else if (!key.startsWith('$')) {
      flattenTokens(child, [...prefix, key], out);
    }
  }
  return out;
}

/**
 * 토큰 값이 가리키는 다른 토큰 경로를 찾는다.
 * @param text 비교용 문자열(없으면 undefined)
 * @returns 가리키는 토큰 경로
 */
function aliasTargets(text: string | undefined): string[] {
  if (text === undefined) {
    return [];
  }
  return [...text.matchAll(ALIAS_REFERENCE)].map((match) => aliasTargetPath(match[1] ?? ''));
}

/**
 * 별칭 참조 안의 경로를 토큰 경로로 바꾼다. `$root`는 그룹과 같은 이름의 변수이므로 뺀다.
 * @param reference 중괄호 안의 경로(`color.white.$root`)
 * @returns `/`로 이은 경로(`color/white`)
 */
function aliasTargetPath(reference: string): string {
  return reference
    .replace(/\.\$root$/u, '')
    .split('.')
    .join('/');
}

/**
 * JSON 문자열을 읽는다.
 * @param text JSON 문자열
 * @returns JSON 값
 */
function parseJson(text: string): unknown {
  const parsed: unknown = JSON.parse(text);
  return parsed;
}

/**
 * 비교할 값을 키 순서와 상관없는 문자열로 바꾼다.
 * @param value JSON 값(없으면 undefined)
 * @returns 키를 정렬한 JSON 문자열, 없으면 빈 문자열
 */
function stableJson(value: unknown): string {
  return value === undefined ? '' : JSON.stringify(sortedKeys(value));
}

/**
 * 객체 키를 재귀적으로 정렬한 사본을 만든다. 배열 순서는 그대로 둔다.
 * @param value JSON 값
 * @returns 키를 정렬한 사본
 */
function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedKeys);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortedKeys(value[key])]),
  );
}

/**
 * 값이 배열이 아닌 객체인지 확인한다.
 * @param value 확인할 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
