// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  findWinner,
  type MatchedLevels,
  parseVarReferences,
  type Registration,
  settersOf,
  shorthandPart,
  type StyleBlock,
  tokenDeclarations,
  toMatchedLevels,
  variablesReached,
} from './declarations.ts';

/**
 * 규칙 블록 하나를 만든다.
 * @param source 선택자
 * @param declarations `이름: 값` 목록(끝에 `!`를 붙이면 !important)
 * @param origin 출처
 * @returns 규칙 블록
 */
function block(source: string, declarations: string[], origin = 'regular'): StyleBlock {
  return {
    source,
    origin,
    declarations: declarations.map((text) => {
      const [name = '', ...rest] = text.split(':');
      const value = rest.join(':').trim();
      const isImportant = value.endsWith('!');
      return {
        name,
        value: isImportant ? value.slice(0, -1).trim() : value,
        important: isImportant,
      };
    }),
  };
}

/**
 * 단계 목록으로 규칙 전체를 만든다.
 * @param levels 대상, 가까운 조상부터의 규칙
 * @param registrations `@property` 등록
 * @returns 규칙 전체
 */
function matchedOf(
  levels: StyleBlock[][],
  registrations: Record<string, Registration> = {},
): MatchedLevels {
  return { levels, registrations: new Map(Object.entries(registrations)) };
}

const theme = block(':root, :host', [
  '--color-blue-dark-1: #005fb8',
  '--color-accent-fill-default: var(--color-blue-dark-1)',
  '--color-accent-text-fill-tertiary: var(--color-blue-dark-1)',
  '--spacing-12: 12px',
  '--spacing-16: 16px',
  '--blur-acrylic: 60px',
  '--backdrop-blur-surface-flyout-acrylic: var(--blur-acrylic)',
]);

// @codocs [[피그마 일치 검사:판정 항목]]
describe('이긴 선언 읽기', () => {
  it('롱핸드를 정할 수 있는 선언은 단축 속성과 논리 속성까지 포함한다', () => {
    expect(settersOf('padding-left')).toEqual([
      'padding-left',
      'padding-inline-start',
      'padding-inline',
      'padding',
    ]);
    expect(settersOf('border-top-left-radius')).toEqual([
      'border-top-left-radius',
      'border-start-start-radius',
      'border-radius',
    ]);
    expect(settersOf('column-gap')).toContain('gap');
    expect(settersOf('bottom')).toEqual(['bottom', 'inset-block-end', 'inset-block', 'inset']);
    expect(settersOf('background-color')).toContain('background');
  });

  it('우선순위가 낮은 것부터 온 규칙에서 마지막 선언이 이기고, 인라인과 !important를 따른다', () => {
    const utilities = block('.px-12', ['padding-inline: var(--spacing-12)']);
    const inline = block('style=""', ['padding-left: 20px'], 'inline');
    expect(findWinner(matchedOf([[utilities]]), 'padding-left', false)?.value).toBe(
      'var(--spacing-12)',
    );
    expect(findWinner(matchedOf([[utilities, inline]]), 'padding-left', false)?.value).toBe('20px');
    const important = block('.x', ['padding-left: 4px !']);
    expect(findWinner(matchedOf([[important, inline]]), 'padding-left', false)?.value).toBe('4px');
  });

  it('상속되는 속성은 자기 선언이 없거나 inherit이면 가까운 조상의 선언을 본다', () => {
    const self = block('button', ['color: inherit']);
    const parent = block('.text-a', ['color: var(--a)']);
    const grand = block('.text-b', ['color: var(--b)']);
    const matched = matchedOf([[self], [], [parent], [grand]]);
    expect(findWinner(matched, 'color', true)).toMatchObject({ value: 'var(--a)', level: 2 });
    expect(findWinner(matched, 'color', false)?.value).toBe('inherit');
  });

  it('변이나 모서리를 값 개수로 나누는 단축 속성은 그 롱핸드의 값만 고른다', () => {
    expect(shorthandPart('padding', 'padding-left', 'var(--a) var(--b)')).toBe('var(--b)');
    expect(shorthandPart('padding', 'padding-top', 'var(--a) var(--b)')).toBe('var(--a)');
    expect(shorthandPart('padding-inline', 'padding-right', 'var(--a) var(--b)')).toBe('var(--b)');
    expect(shorthandPart('gap', 'column-gap', 'var(--a) var(--b)')).toBe('var(--b)');
    expect(shorthandPart('border-radius', 'border-bottom-left-radius', '1px 2px 3px 4px')).toBe(
      '4px',
    );
    expect(shorthandPart('background', 'background-color', 'white')).toBe('white');
  });

  it('var() 참조를 찾고 대체값 안의 참조는 대체값으로 남긴다', () => {
    expect(parseVarReferences('blur(var(--x)) var(--y, var(--z))')).toEqual([
      { name: '--x', fallback: null },
      { name: '--y', fallback: ' var(--z)' },
    ]);
    expect(parseVarReferences('var(--tw-backdrop-blur,)')).toEqual([
      { name: '--tw-backdrop-blur', fallback: '' },
    ]);
  });

  it('var() 사슬은 요소나 조상의 사용자 속성 선언으로 풀어 닿는 이름을 모두 모은다', () => {
    const matched = matchedOf([[], [theme]]);
    expect([...variablesReached(matched, 0, 'var(--color-accent-fill-default)')]).toEqual([
      '--color-accent-fill-default',
      '--color-blue-dark-1',
    ]);
  });

  it('정의가 없는 사용자 속성은 대체값을, 등록한 초기값이 있으면 초기값을 쓴다', () => {
    const utility = block('.backdrop-blur-x', [
      '--tw-backdrop-blur: blur(var(--backdrop-blur-surface-flyout-acrylic))',
      'backdrop-filter: var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,)',
    ]);
    const names = variablesReached(
      matchedOf([[utility], [theme]], {
        '--tw-backdrop-blur': { inherits: false, initialValue: null },
      }),
      0,
      'var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,)',
    );
    expect(names).toContain('--backdrop-blur-surface-flyout-acrylic');
    expect(names).toContain('--blur-acrylic');
    const fallback = variablesReached(
      matchedOf([[], [theme]]),
      0,
      'var(--missing, var(--spacing-12))',
    );
    expect(fallback).toContain('--spacing-12');
    const registered = variablesReached(
      matchedOf([[], [theme]], {
        '--tw-x': { inherits: false, initialValue: 'var(--spacing-16)' },
      }),
      0,
      'var(--tw-x, var(--spacing-12))',
    );
    expect(registered).toContain('--spacing-16');
    expect(registered).not.toContain('--spacing-12');
  });

  it('상속하지 않게 등록한 사용자 속성은 조상의 선언을 보지 않는다', () => {
    const parent = block('.parent', ['--tw-x: var(--spacing-16)']);
    const names = variablesReached(
      matchedOf([[], [parent]], { '--tw-x': { inherits: false, initialValue: null } }),
      0,
      'var(--tw-x, var(--spacing-12))',
    );
    expect([...names]).toEqual(['--tw-x', '--spacing-12']);
  });

  it('값이 같은 다른 토큰은 이름으로 구별된다', () => {
    const matched = matchedOf([[], [theme]]);
    const names = variablesReached(matched, 0, 'var(--color-accent-text-fill-tertiary)');
    expect(names.has('--color-accent-fill-default')).toBe(false);
  });
});

// @codocs [[피그마 일치 검사:짝짓기]]
describe('표시 없는 요소의 토큰 선언', () => {
  it('자기 클래스 규칙의 선언이 디자인 토큰에 닿으면 찾는다', () => {
    const tokenNames = new Set(['--color-accent-fill-default', '--color-blue-dark-1']);
    const own = [
      block('.bg-accent-fill-default', ['background-color: var(--color-accent-fill-default)']),
      block('*, ::before', ['border: 0 solid']),
      block('span', ['color: var(--color-accent-fill-default)']),
      block('div', ['color: var(--color-accent-fill-default)'], 'user-agent'),
    ];
    expect(tokenDeclarations(matchedOf([own, [theme]]), tokenNames)).toEqual([
      'background-color: var(--color-accent-fill-default)',
    ]);
  });
});

describe('CDP 응답 읽기', () => {
  it('단축 속성을 펼친 롱핸드(소스 범위 없음)는 빼고 실제로 쓴 선언만 남긴다', () => {
    const range = { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 };
    const matched = toMatchedLevels({
      matchedCSSRules: [
        {
          rule: {
            origin: 'regular',
            selectorList: { text: '.px-12' },
            style: {
              cssProperties: [
                { name: 'padding-inline', value: 'var(--spacing-12)', range },
                { name: 'padding-inline-start', value: '' },
                { name: 'padding-inline-end', value: '' },
              ],
            },
          },
        },
        {
          rule: {
            origin: 'user-agent',
            selectorList: { text: 'button' },
            style: { cssProperties: [{ name: 'padding-left', value: '6px' }] },
          },
        },
      ],
      inherited: [{ matchedCSSRules: [] }],
      cssPropertyRules: [
        {
          propertyName: { text: '--tw-shadow' },
          style: {
            cssProperties: [
              { name: 'inherits', value: 'false' },
              { name: 'initial-value', value: '0 0 #0000' },
            ],
          },
        },
      ],
    });
    expect(matched.levels[0]?.map((item) => item.declarations.map((d) => d.name))).toEqual([
      ['padding-inline'],
      ['padding-left'],
    ]);
    expect(matched.levels).toHaveLength(2);
    expect(matched.registrations.get('--tw-shadow')).toEqual({
      inherits: false,
      initialValue: '0 0 #0000',
    });
  });
});
