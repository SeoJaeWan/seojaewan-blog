// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ESLint } from 'eslint';
import { __unstable__loadDesignSystem as loadDesignSystem } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

import { packageRoot, tokensCssPath } from '../package-paths.ts';

// 저장소 ESLint 설정(eslint.config.mjs)을 그대로 쓴다. 타입 정보가 필요한 규칙이 있어 tsconfig에 든
// 실제 컴포넌트 파일 자리에서 내용만 바꿔 검사한다.
const repositoryRoot = path.resolve(packageRoot, '..', '..');
const componentFile = path.join(packageRoot, 'src', 'components', 'button', 'button.tsx');
const UNKNOWN_CLASS_RULE = 'better-tailwindcss/no-unknown-classes';
const RESTRICTED_CLASS_RULE = 'better-tailwindcss/no-restricted-classes';
const RESTRICTED_SYNTAX_RULE = 'no-restricted-syntax';
const tokensCss = readFileSync(tokensCssPath, 'utf8');
const motionCss = readFileSync(path.join(packageRoot, 'src', 'motion.css'), 'utf8');

// 이름공간이 Tailwind 기본 이름공간과 같아 Tailwind 기본 유틸리티로 쓰는 토큰이다(별칭 변수가 경로 전체를 붙인다).
// 이름공간마다 그 유틸리티가 정해야 하는 CSS 속성이다.
const intendedBuiltIn: readonly (readonly [string, RegExp])[] = [
  // 원색은 Tailwind 색 이름공간이라 색을 받는 기본 유틸리티(글자, 배경, 선, 바깥 선, 칠 등)가 모두 읽는다.
  ['--color-', /./u],
  ['--spacing-', /./u],
  ['--radius-', /radius:/u],
  ['--opacity-', /opacity/u],
  ['--blur-', /blur\(/u],
  ['--font-weight-', /font-weight:/u],
  ['--stroke-width-', /stroke-width:/u],
  ['--rotate-', /rotate/u],
  ['--z-index-', /z-index:/u],
  ['--inset-', /inset|top:|right:|bottom:|left:/u],
  ['--translate-', /translate/u],
  ['--line-clamp-', /line-clamp/u],
  ['--aspect-', /aspect-ratio:/u],
  ['--grid-column-start-', /grid-column-start:/u],
  ['--grid-row-start-', /grid-row-start:/u],
];

/**
 * 클래스를 쓴 컴포넌트를 검사해 규칙 하나의 오류를 모은다.
 * @param className 검사할 클래스
 * @param ruleId 모을 규칙
 * @param isCnArgument true면 `className` 속성 대신 `cn()` 인자로 넘긴다
 * @param prelude 컴포넌트 앞에 넣는 코드
 * @returns 오류 메시지
 */
async function lintClassErrors(
  className: string,
  ruleId: string,
  isCnArgument = false,
  prelude = '',
): Promise<string[]> {
  const element = isCnArgument
    ? `<div className={cn('${className}')} />`
    : `<div className="${className}" />`;
  return lintElementErrors(element, ruleId, prelude);
}

/**
 * 요소를 그리는 컴포넌트를 검사해 규칙 하나의 오류를 모은다.
 * @param element 컴포넌트가 돌려주는 JSX
 * @param ruleId 모을 규칙
 * @param prelude 컴포넌트 앞에 넣는 코드
 * @returns 오류 메시지
 */
async function lintElementErrors(element: string, ruleId: string, prelude = ''): Promise<string[]> {
  const eslint = new ESLint({ cwd: repositoryRoot });
  const source = [
    "import type { JSX } from 'react';",
    "import { cn } from '../../cn';",
    '',
    prelude,
    '',
    '/**',
    ' * 검사용 요소를 그린다.',
    ' */',
    'export function LintProbe(): JSX.Element {',
    `  return ${element};`,
    '}',
    '',
  ].join('\n');
  const [result] = await eslint.lintText(source, { filePath: componentFile });
  const messages = result?.messages ?? [];
  const fatal = messages.find((message) => message.fatal === true);
  if (fatal !== undefined) {
    throw new Error(fatal.message);
  }
  return messages.filter((message) => message.ruleId === ruleId).map((message) => message.message);
}

/**
 * Tailwind 기본 유틸리티 중 tokens.css의 @theme 변수를 읽지만, tokens.css의 @utility가 아니고 의도한
 * 이름공간 쓰임도 아닌 클래스를 모은다.
 * @returns 클래스 목록
 */
async function misreadBuiltInClasses(): Promise<string[]> {
  const require = createRequire(import.meta.url);
  const designSystem = await loadDesignSystem(`@import 'tailwindcss';\n${tokensCss}`, {
    base: packageRoot,
    loadStylesheet: async (id, base) => {
      const file = require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id);
      return Promise.resolve({ path: file, base, content: readFileSync(file, 'utf8') });
    },
  });
  const theme = tokensCss.split('@theme static {')[1]?.split('\n}')[0] ?? '';
  const themeNames = new Set(
    [...theme.matchAll(/^\s+(--[a-z0-9-]+):/gmu)].map((match) => match[1]),
  );
  const ownRoots = [...tokensCss.matchAll(/^@utility ([a-z0-9-]+?)(-\*)? \{/gmu)].map((match) =>
    match[2] === undefined ? (match[1] ?? '') : `${match[1] ?? ''}-`,
  );
  return designSystem
    .getClassList()
    .map(([name]) => name)
    .filter(
      (name) =>
        !ownRoots.some((root) => (root.endsWith('-') ? name.startsWith(root) : name === root)),
    )
    .filter((name) => {
      const css = designSystem.candidatesToCss([name])[0] ?? '';
      const used = [...css.matchAll(/var\((--[a-z0-9-]+)/gu)]
        .map((match) => match[1] ?? '')
        .filter((variable) => themeNames.has(variable));
      return used.some(
        (variable) =>
          !intendedBuiltIn.some(
            ([namespace, property]) => variable.startsWith(namespace) && property.test(css),
          ),
      );
    });
}

// @codocs [[피그마 연동:토큰 사용 강제]]
describe('토큰 사용 강제', () => {
  it('tokens.css의 @utility가 만든 토큰 클래스와 값 종류 토큰의 Tailwind 기본 클래스는 lint가 안다', async () => {
    await expect(
      lintClassErrors(
        'bg-color-blue-59 text-color-black-89 border-color-black-6 outline-color-black-89 inner-border-color-black-6 w-size-menu-width border-stroke-width-default type-body surface-flyout-acrylic text-shadow-elevation-desktop-label material-acrylic-default p-spacing-md rounded-radius-control',
        UNKNOWN_CLASS_RULE,
      ),
    ).resolves.toEqual([]);
  }, 60_000);

  it('motion.css의 @utility가 만든 motion-* 클래스는 lint가 알고 막지 않는다', async () => {
    const classes = [...motionCss.matchAll(/^@utility (motion-[a-z0-9-]+) \{/gmu)].map(
      (match) => match[1] ?? '',
    );
    expect(classes).toContain('motion-control-state');
    const className = classes.map((name) => `hover:${name} ${name}`).join(' ');
    await expect(lintClassErrors(className, UNKNOWN_CLASS_RULE)).resolves.toEqual([]);
    await expect(lintClassErrors(className, RESTRICTED_CLASS_RULE)).resolves.toEqual([]);
  }, 60_000);

  it('duration-·ease-·delay-·transition·animate-로 시작하는 클래스는 motion-* 클래스를 쓰라고 lint가 막는다', async () => {
    const classes = [
      'duration-150',
      'ease-linear',
      'delay-100',
      'transition',
      'transition-colors',
      'hover:transition-opacity',
      'animate-spin',
    ];
    const errors = await lintClassErrors(classes.join(' '), RESTRICTED_CLASS_RULE, true);
    expect(errors).toHaveLength(classes.length);
    expect(errors.every((message) => message.includes('motion-*'))).toBe(true);
  }, 60_000);

  it('토큰에 없는 이름의 클래스는 lint가 막는다', async () => {
    await expect(
      lintClassErrors(
        'bg-color-missing w-missing-width type-missing surface-missing',
        UNKNOWN_CLASS_RULE,
      ),
    ).resolves.toEqual([
      'Unknown class detected: bg-color-missing',
      'Unknown class detected: w-missing-width',
      'Unknown class detected: type-missing',
      'Unknown class detected: surface-missing',
    ]);
  }, 60_000);

  it('cn 인자 안의 토큰에 없는 클래스도 lint가 막는다', async () => {
    await expect(
      lintClassErrors('bg-color-missing w-size-menu-width', UNKNOWN_CLASS_RULE, true),
    ).resolves.toEqual(['Unknown class detected: bg-color-missing']);
  }, 60_000);

  it('이름이 ClassNames·CLASS_NAMES로 끝나는 객체의 값도 lint가 검사한다', async () => {
    const prelude = [
      "const SIZE_CLASS_NAMES = { wide: 'w-missing-a', narrow: 'w-size-menu-width' } as const;",
      "const toneClassNames: Readonly<Record<string, string>> = { on: 'bg-color-missing' };",
      "const toneStyles = { on: 'bg-not-class-object' };",
      'export const probe = [SIZE_CLASS_NAMES, toneClassNames, toneStyles];',
    ].join('\n');
    await expect(
      lintClassErrors('w-size-menu-width', UNKNOWN_CLASS_RULE, false, prelude),
    ).resolves.toEqual([
      'Unknown class detected: w-missing-a',
      'Unknown class detected: bg-color-missing',
    ]);
  }, 60_000);

  it('이름이 ClassName·CLASS_NAME으로 끝나는 문자열·배열 상수와 *ClassName 속성도 lint가 검사한다', async () => {
    const prelude = [
      "const ROW_CLASS_NAME = 'w-missing-a';",
      "const INDENT_CLASS_NAMES = ['', 'w-missing-b'] as const;",
      "const toneClassName = Math.random() > 0 ? 'w-missing-c' : 'w-full';",
      "const zoneClass = 'w-not-class-name';",
      'export const probe = [ROW_CLASS_NAME, INDENT_CLASS_NAMES, toneClassName, zoneClass];',
      'declare function Item(props: { itemClassName: string }): JSX.Element;',
    ].join('\n');
    await expect(
      lintElementErrors('<Item itemClassName="w-missing-d" />', UNKNOWN_CLASS_RULE, prelude),
    ).resolves.toEqual([
      'Unknown class detected: w-missing-a',
      'Unknown class detected: w-missing-b',
      'Unknown class detected: w-missing-c',
      'Unknown class detected: w-missing-d',
    ]);
  }, 60_000);

  it('className 안에서 .join()으로 클래스를 이으면 lint가 막는다', async () => {
    await expect(
      lintElementErrors("<div className={['flex', 'w-full'].join(' ')} />", RESTRICTED_SYNTAX_RULE),
    ).resolves.toHaveLength(1);
  }, 60_000);

  it('객체의 className 키 값은 함수 인자·변수 초기값·JSX 속성 값 어디서든 lint가 검사한다', async () => {
    const prelude = [
      'declare function renderWindow(target: string, options: { className: string }): JSX.Element;',
      'declare function Story(props: { args: { className: string; name: string } }): JSX.Element;',
      "const meta = { args: { name: 'w-not-class-key', className: 'w-missing-b' } };",
      "export const probe = [meta, renderWindow('a', { className: 'w-missing-a' })];",
    ].join('\n');
    await expect(
      lintElementErrors(
        "<Story args={{ name: 'w-not-class-key', className: 'w-missing-c' }} />",
        UNKNOWN_CLASS_RULE,
        prelude,
      ),
    ).resolves.toEqual([
      'Unknown class detected: w-missing-b',
      'Unknown class detected: w-missing-a',
      'Unknown class detected: w-missing-c',
    ]);
  }, 60_000);

  it('style 객체에 값을 직접(리터럴, 식 없는 템플릿) 쓰면 lint가 막는다', async () => {
    const element = [
      '<>',
      "  <div style={{ scrollbarWidth: 'none', width: 100, left: -1, top: `calc(100% + 8px)` }} />",
      '  <div style={Math.random() > 0 ? { height: 32 } : undefined} />',
      '</>',
    ].join('\n');
    const errors = await lintElementErrors(element, RESTRICTED_SYNTAX_RULE);
    expect(errors).toHaveLength(5);
    expect(errors.every((message) => message.includes('style에 값을 직접 쓰지 않는다'))).toBe(true);
  }, 60_000);

  it('style 객체의 실행 중 계산한 값(식별자, 멤버 접근, 함수 호출, 식이 든 템플릿)은 막지 않는다', async () => {
    const prelude = [
      'declare const origin: { x: number; y: number };',
      'declare const zIndex: number;',
      'declare function getHeight(): number;',
    ].join('\n');
    const element =
      '<div style={{ zIndex, left: origin.x, top: origin.y + 1, height: getHeight(), transform: `scale(${String(zIndex)})` }} />';
    await expect(lintElementErrors(element, RESTRICTED_SYNTAX_RULE, prelude)).resolves.toEqual([]);
  }, 60_000);

  it('숫자 값 클래스는 lint가 막는다', async () => {
    const classes = [
      'shrink-0',
      'flex-1',
      'rotate-180',
      '-rotate-90',
      'z-10',
      'line-clamp-2',
      'scale-110',
      'border-3',
      'opacity-37',
      'order-3',
      'grid-cols-5',
      'w-1/2',
      'aspect-3/2',
      'mask-l-from-50%',
      'bg-color-white-70/50',
      'text-color-gray-12',
      'hover:rotate-45',
      'laptop:shrink-0',
      'shrink-0!',
    ];
    const errors = await lintClassErrors(classes.join(' '), RESTRICTED_CLASS_RULE, true);
    expect(errors).toHaveLength(classes.length);
    expect(errors.every((message) => message.includes('숫자 값 클래스'))).toBe(true);
  }, 60_000);

  it('토큰 이름의 클래스와 숫자가 아닌 기본 클래스는 숫자 규칙에 걸리지 않는다', async () => {
    await expect(
      lintClassErrors(
        'p-spacing-2xs w-size-icon-2xl size-size-icon-3xl shrink-shrink-none rotate-rotate-half rounded-full w-full text-color-black-89 hover:bg-color-white-70 inner-border-color-black-6 border-color-blue-59!',
        RESTRICTED_CLASS_RULE,
      ),
    ).resolves.toEqual([]);
  }, 60_000);

  it('text-shadow 값 변수를 box-shadow로 읽은 shadow-text-* 클래스는 lint가 막는다', async () => {
    const className = 'shadow-text-elevation-desktop-label';
    expect(tokensCss).toContain('--shadow-text-elevation-desktop-label:');
    await expect(lintClassErrors(className, RESTRICTED_CLASS_RULE)).resolves.toHaveLength(1);
    await expect(lintClassErrors(className, UNKNOWN_CLASS_RULE)).resolves.toEqual([]);
  }, 60_000);

  it('Tailwind 기본 유틸리티가 토큰 변수를 다른 속성으로 읽은 클래스는 lint가 막는다', async () => {
    const classes = await misreadBuiltInClasses();
    const errors = await lintClassErrors(classes.join(' '), RESTRICTED_CLASS_RULE);
    expect({ classes, count: errors.length }).toEqual({ classes, count: classes.length });
  }, 60_000);
});
