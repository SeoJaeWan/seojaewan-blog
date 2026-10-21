/**
 * 피그마 변형을 Storybook 스토리 주소와 상호작용으로 바꾼다.
 * 규칙은 [[피그마 일치 검사:스토리 규칙]]에 있다.
 */

import { normalizeName } from './figma-export.ts';
import { PARITY_STORY_NAME, STATE_PROPERTY } from './parity-config.ts';

export type StoryArgValue = string | boolean;

export type Interaction = 'none' | 'hover' | 'pressed' | 'focus';

export type StoryTarget = {
  /** 스토리 args. 피그마 속성 이름을 camelCase로, 값을 정규화한 이름으로 바꾼 것이다 */
  args: Record<string, StoryArgValue>;
  /** 스크린샷 전에 브라우저에서 재현할 상호작용 */
  interaction: Interaction;
};

// 상태 값마다 브라우저에서 재현할 상호작용이다. 여기에 없는 값(rest, disabled, selected 등)은 args로만 넘긴다.
const interactionByState = new Map<string, Interaction>([
  ['hover', 'hover'],
  ['hovered', 'hover'],
  ['pointer-over', 'hover'],
  ['pressed', 'pressed'],
  ['pressed-down', 'pressed'],
  ['active', 'pressed'],
  ['focus', 'focus'],
  ['focused', 'focus'],
  ['focus-visible', 'focus'],
]);

/**
 * 피그마 변형 속성을 스토리 args와 상호작용으로 바꾼다.
 * @codocs [[피그마 일치 검사:스토리 규칙]]
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
 * args를 Storybook 주소의 `args` 값으로 바꾼다(`variant:accent;disabled:!true`).
 * @param args 스토리 args
 * @returns URL에 넣기 전의 `args` 값
 */
export function storyArgsParam(args: Readonly<Record<string, StoryArgValue>>): string {
  return Object.entries(args)
    .map(([name, value]) => `${name}:${typeof value === 'boolean' ? `!${String(value)}` : value}`)
    .join(';');
}

/**
 * Storybook index.json에서 컴포넌트의 일치 검사 스토리 ID를 찾는다.
 * @param index storybook-static/index.json을 파싱한 값
 * @param component 컴포넌트 폴더 이름
 * @returns 스토리 ID. 없으면 undefined
 */
export function findParityStoryId(index: unknown, component: string): string | undefined {
  const importPath = `./src/components/${component}/${component}.stories.tsx`;
  if (typeof index !== 'object' || index === null || !('entries' in index)) {
    return undefined;
  }
  const { entries } = index;
  if (typeof entries !== 'object' || entries === null) {
    return undefined;
  }
  const values: unknown[] = Object.values(entries);
  for (const entry of values) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'id' in entry &&
      typeof entry.id === 'string' &&
      'importPath' in entry &&
      entry.importPath === importPath &&
      'name' in entry &&
      entry.name === PARITY_STORY_NAME
    ) {
      return entry.id;
    }
  }
  return undefined;
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
