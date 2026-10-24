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
const tokensCss = readFileSync(tokensCssPath, 'utf8');

// 이름공간이 Tailwind 기본 이름공간과 같아 Tailwind 기본 유틸리티로 쓰는 토큰이다(값 종류 토큰은 클래스에서
// 이름공간을 뺀다). 이름공간마다 그 유틸리티가 정해야 하는 CSS 속성이다.
const intendedBuiltIn: readonly (readonly [string, RegExp])[] = [
  ['--spacing-', /./u],
  ['--radius-', /radius:/u],
  ['--opacity-', /opacity/u],
  ['--blur-', /blur\(/u],
  ['--font-weight-', /font-weight:/u],
  ['--stroke-width-', /stroke-width:/u],
];

/**
 * 클래스를 쓴 컴포넌트를 검사해 규칙 하나의 오류를 모은다.
 * @param className 검사할 클래스
 * @param ruleId 모을 규칙
 * @param isCnArgument true면 `className` 속성 대신 `cn()` 인자로 넘긴다
 * @returns 오류 메시지
 */
async function lintClassErrors(
  className: string,
  ruleId: string,
  isCnArgument = false,
): Promise<string[]> {
  const eslint = new ESLint({ cwd: repositoryRoot });
  const element = isCnArgument
    ? `<div className={cn('${className}')} />`
    : `<div className="${className}" />`;
  const source = [
    "import type { JSX } from 'react';",
    "import { cn } from '../../cn';",
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
        'bg-accent-fill-default text-text-fill-primary w-320 border-default type-body surface-flyout-acrylic text-shadow-elevation-desktop-label material-acrylic-default duration-fast ease-fade p-12 rounded-control',
        UNKNOWN_CLASS_RULE,
      ),
    ).resolves.toEqual([]);
  }, 60_000);

  it('토큰에 없는 이름의 클래스는 lint가 막는다', async () => {
    await expect(
      lintClassErrors(
        'bg-accent-fill-missing w-missing-width type-missing surface-missing',
        UNKNOWN_CLASS_RULE,
      ),
    ).resolves.toEqual([
      'Unknown class detected: bg-accent-fill-missing',
      'Unknown class detected: w-missing-width',
      'Unknown class detected: type-missing',
      'Unknown class detected: surface-missing',
    ]);
  }, 60_000);

  it('cn 인자 안의 토큰에 없는 클래스도 lint가 막는다', async () => {
    await expect(
      lintClassErrors('bg-accent-fill-missing w-320', UNKNOWN_CLASS_RULE, true),
    ).resolves.toEqual(['Unknown class detected: bg-accent-fill-missing']);
  }, 60_000);

  it('text-shadow 값 변수를 box-shadow로 읽은 shadow-text-* 클래스는 lint가 막는다', async () => {
    const className = 'shadow-text-elevation-desktop-label';
    expect(tokensCss).toContain('--shadow-text-elevation-desktop-label:');
    await expect(lintClassErrors(className, RESTRICTED_CLASS_RULE)).resolves.toHaveLength(1);
    await expect(lintClassErrors(className, UNKNOWN_CLASS_RULE)).resolves.toEqual([]);
  }, 60_000);

  it('Tailwind 기본 유틸리티가 토큰 변수를 다른 속성으로 읽은 클래스는 lint가 막는다', async () => {
    const classes = await misreadBuiltInClasses();
    expect(classes).toContain('text-fill-primary');
    const errors = await lintClassErrors(classes.join(' '), RESTRICTED_CLASS_RULE);
    expect({ classes, count: errors.length }).toEqual({ classes, count: classes.length });
  }, 60_000);
});
