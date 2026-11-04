// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { packageRoot } from './package-paths.ts';

// 저장소 ESLint 설정(eslint.config.mjs)을 그대로 쓴다. tsconfig에 든 실제 컴포넌트 파일 자리에서 내용만 바꿔 검사한다.
const repositoryRoot = path.resolve(packageRoot, '..', '..');
const componentFile = path.join(packageRoot, 'src', 'components', 'button', 'button.tsx');
const RESTRICTED_SYNTAX_RULE = 'no-restricted-syntax';
const PROPS_BOOLEAN_MESSAGE = 'Props 타입에 선언한 boolean 속성은';

/**
 * 타입 선언을 검사해 Props boolean 이름 오류를 모은다.
 * @param declarations 검사할 타입 선언 코드
 * @returns Props boolean 이름 오류 메시지
 */
async function lintPropsBooleanErrors(declarations: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: repositoryRoot });
  const source = [
    "import type { ComponentProps } from 'react';",
    '',
    declarations,
    '',
    'export type { ComponentProps };',
    '',
  ].join('\n');
  const [result] = await eslint.lintText(source, { filePath: componentFile });
  const messages = result?.messages ?? [];
  const fatal = messages.find((message) => message.fatal === true);
  if (fatal !== undefined) {
    throw new Error(fatal.message);
  }
  return messages
    .filter(
      (message) =>
        message.ruleId === RESTRICTED_SYNTAX_RULE &&
        message.message.startsWith(PROPS_BOOLEAN_MESSAGE),
    )
    .map((message) => `${message.line}`);
}

// @codocs [[코드 작성 규칙:식별자 이름]]
describe('Props 타입의 boolean 속성 이름 lint', () => {
  it('접두어가 없는 boolean 속성을 막는다', async () => {
    await expect(
      lintPropsBooleanErrors(['export type FooProps = {', '  open?: boolean;', '};'].join('\n')),
    ).resolves.toEqual(['4']);
  }, 60_000);

  it('is·has·can·should로 시작하는 boolean 속성은 통과한다', async () => {
    await expect(
      lintPropsBooleanErrors(
        [
          'export type FooProps = {',
          '  isOpen?: boolean;',
          '  hasIcon: boolean;',
          '  canGoBack?: boolean;',
          '  shouldAutoFocus?: boolean;',
          '};',
        ].join('\n'),
      ),
    ).resolves.toEqual([]);
  }, 60_000);

  it('접두어 뒤가 소문자로 이어지는 이름(island)은 접두어로 보지 않는다', async () => {
    await expect(
      lintPropsBooleanErrors(['export type FooProps = {', '  island: boolean;', '};'].join('\n')),
    ).resolves.toEqual(['4']);
  }, 60_000);

  it('boolean | undefined도 boolean으로 본다', async () => {
    await expect(
      lintPropsBooleanErrors(
        [
          'export type FooProps = {',
          '  active: boolean | undefined;',
          '  full: undefined | boolean;',
          '};',
        ].join('\n'),
      ),
    ).resolves.toEqual(['4', '5']);
  }, 60_000);

  it('교차 타입 안에 직접 선언한 속성도 막고, 이어받은 HTML 속성은 막지 않는다', async () => {
    await expect(
      lintPropsBooleanErrors(
        [
          "export type FooProps = ComponentProps<'button'> & {",
          '  disabled: boolean;',
          '};',
          "export type BarProps = Omit<ComponentProps<'button'>, 'className'> & {",
          '  label: string;',
          '};',
        ].join('\n'),
      ),
    ).resolves.toEqual(['4']);
  }, 60_000);

  it('boolean이 아닌 속성은 이름을 따지지 않는다', async () => {
    await expect(
      lintPropsBooleanErrors(
        ['export type FooProps = {', '  open?: string;', '  selected: number;', '};'].join('\n'),
      ),
    ).resolves.toEqual([]);
  }, 60_000);

  it('이름이 Props로 끝나지 않는 데이터 타입은 검사하지 않는다', async () => {
    await expect(
      lintPropsBooleanErrors(
        ['export type Item = {', '  selected: boolean;', '  ok: boolean;', '};'].join('\n'),
      ),
    ).resolves.toEqual([]);
  }, 60_000);
});
