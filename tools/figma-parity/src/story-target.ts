/**
 * 피그마 변형을 Storybook 스토리 주소와 상호작용으로 바꾼다.
 * 규칙은 [[피그마 연동:스토리 규칙]]에 있다.
 */

import type { Target } from './targets.ts';
import { normalizeName } from './variant-name.ts';

export type StoryArgValue = string | boolean;

export type Interaction = 'none' | 'hover' | 'pressed' | 'focus';

export type StoryTarget = {
  /** 스토리 args. 피그마 속성 이름을 camelCase로, 값을 정규화한 이름으로 바꾼 것이다 */
  args: Record<string, StoryArgValue>;
  /** 캡처 전에 브라우저에서 재현할 상호작용 */
  interaction: Interaction;
};

// 컴포넌트마다 캡처에 쓰는 스토리 이름이다(export 이름 Parity에서 나온다).
export const PARITY_STORY_NAME = 'Parity';
// 조립 스토리 제목의 앞부분이다(`Patterns/` + 피그마 조립 이름).
export const PATTERN_TITLE_PREFIX = 'Patterns/';
// 상호작용으로 재현하는 상태 속성 이름(정규화한 이름)이다.
const STATE_PROPERTY = 'state';

// 상태 값마다 브라우저에서 재현할 상호작용이다. 여기에 없는 값(rest, disabled, selected, active 등)은 args로만 넘긴다.
// Active는 누르는 중이 아니라 활성 창·지금 고른 탭이라 args로 재현한다(@codocs [[컴포넌트 목록:상태]]).
const interactionByState = new Map<string, Interaction>([
  ['hover', 'hover'],
  ['hovered', 'hover'],
  ['pointer-over', 'hover'],
  ['pressed', 'pressed'],
  ['pressed-down', 'pressed'],
  ['focus', 'focus'],
  ['focused', 'focus'],
  ['focus-visible', 'focus'],
]);

/**
 * 피그마 변형 속성을 스토리 args와 상호작용으로 바꾼다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param properties 피그마 순서의 `[속성, 값]` 목록
 * @returns 스토리 args와 재현할 상호작용
 */
export function storyTarget(properties: readonly (readonly [string, string])[]): StoryTarget {
  const args: Record<string, StoryArgValue> = {};
  let interaction: Interaction = 'none';
  for (const [name, value] of properties) {
    const argName = camelCase(name);
    const argValue = normalizeName(value);
    args[argName] = argValue === 'true' ? true : argValue === 'false' ? false : argValue;
    if (normalizeName(name) === STATE_PROPERTY) {
      interaction = interactionByState.get(argValue) ?? 'none';
    }
  }
  return { args, interaction };
}

/**
 * args를 Storybook 주소의 `args` 값으로 바꾼다(`style:accent;showIcon:!true`).
 * @param args 스토리 args
 * @returns URL에 넣기 전의 `args` 값
 */
export function storyArgsParam(args: Readonly<Record<string, StoryArgValue>>): string {
  return Object.entries(args)
    .map(([name, value]) => `${name}:${typeof value === 'boolean' ? `!${String(value)}` : value}`)
    .join(';');
}

/** Storybook index.json의 스토리 항목 */
export type IndexEntry = { id: string; title: string; name: string; importPath: string };

/**
 * Storybook index.json에서 대상과 짝인 스토리 ID를 찾는다.
 * 컴포넌트는 `src/components/<c>/<c>.stories.tsx`의 `Parity` 스토리,
 * 조립은 제목이 `Patterns/<조립 이름>`인 스토리다(여럿이면 `Parity` 스토리).
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param index storybook-static/index.json을 파싱한 값
 * @param target 대상
 * @returns 스토리 ID, 또는 찾지 못한 이유
 */
export function findStoryId(
  index: unknown,
  target: Pick<Target, 'id' | 'kind' | 'name'>,
): { ok: true; id: string } | { ok: false; message: string } {
  const entries = storyEntries(index);
  if (target.kind === 'component') {
    const importPath = `./src/components/${target.id}/${target.id}.stories.tsx`;
    const found = entries.find(
      (entry) => entry.importPath === importPath && entry.name === PARITY_STORY_NAME,
    );
    return found === undefined
      ? {
          ok: false,
          message: `스토리가 없다: ${importPath.slice(2)}에 ${PARITY_STORY_NAME} 스토리를 만든다`,
        }
      : { ok: true, id: found.id };
  }
  const title = `${PATTERN_TITLE_PREFIX}${target.name}`;
  const titled = entries.filter((entry) => entry.title === title);
  const found =
    titled.length === 1 ? titled[0] : titled.find((entry) => entry.name === PARITY_STORY_NAME);
  if (found === undefined) {
    return {
      ok: false,
      message:
        titled.length === 0
          ? `스토리가 없다: 앱 Storybook에 제목이 "${title}"인 스토리를 만든다`
          : `"${title}" 스토리가 여럿이라 고를 수 없다. 캡처할 스토리 이름을 ${PARITY_STORY_NAME}로 둔다`,
    };
  }
  return { ok: true, id: found.id };
}

/**
 * index.json에서 스토리 항목(문서 항목 제외)을 꺼낸다.
 * @param index index.json을 파싱한 값
 * @returns 스토리 항목
 */
export function storyEntries(index: unknown): IndexEntry[] {
  const entries: unknown =
    typeof index === 'object' && index !== null ? Reflect.get(index, 'entries') : undefined;
  if (typeof entries !== 'object' || entries === null) {
    return [];
  }
  return Object.values(entries).flatMap(
    /**
     * 항목이 스토리면 필요한 칸만 꺼낸다.
     * @param entry index.json 항목
     * @returns 스토리 항목 하나나 빈 목록
     */
    (entry: unknown): IndexEntry[] => {
      if (typeof entry !== 'object' || entry === null) {
        return [];
      }
      const [id, title, name, importPath, type] = ['id', 'title', 'name', 'importPath', 'type'].map(
        (key): unknown => Reflect.get(entry, key),
      );
      return typeof id === 'string' &&
        typeof title === 'string' &&
        typeof name === 'string' &&
        typeof importPath === 'string' &&
        type === 'story'
        ? [{ id, title, name, importPath }]
        : [];
    },
  );
}

/**
 * 피그마 속성 이름을 camelCase arg 이름으로 바꾼다(`Show Icon` → `showIcon`).
 * @param name 피그마 속성 이름
 * @returns camelCase 이름
 */
export function camelCase(name: string): string {
  const [first = '', ...rest] = normalizeName(name).split('-');
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
