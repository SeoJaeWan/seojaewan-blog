/**
 * 사람이나 에이전트가 쓴 src/tokens.css가 figma/tokens.json과 맞는지 비교한다(토큰 값 비교).
 * 이름은 이름 규칙으로, 값은 값 변환으로 맞춰 비교하고, 그라데이션·재질·효과·글자 스타일은 있는지만 본다.
 * 규칙은 [[피그마 일치 검사:판정 항목]]의 "토큰 값 비교"와 [[피그마 일치 검사:토큰 작성]]에 있다.
 */

import { matchesExpected, parseColor, splitTopLevel } from './css-values.ts';
import {
  aliasTarget,
  cssNamesOf,
  expectedOfValue,
  type FigmaTokens,
  resolveToken,
} from './figma-tokens.ts';

/** tokens.css를 읽은 결과 */
export type TokensCss = {
  /** `@theme` 블록의 사용자 속성 이름 → 값 */
  theme: ReadonlyMap<string, string>;
  /** `@utility` 이름 */
  utilities: ReadonlySet<string>;
};

/**
 * tokens.css 글자를 `@theme` 사용자 속성과 `@utility` 이름으로 나눈다.
 * @param css tokens.css 내용
 * @returns 사용자 속성과 유틸리티
 */
export function readTokensCss(css: string): TokensCss {
  const text = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const theme = new Map<string, string>();
  for (const match of text.matchAll(/@theme[^{]*\{/gu)) {
    const body = blockBody(text, match.index + match[0].length);
    for (const declaration of splitDeclarations(body)) {
      const separator = declaration.indexOf(':');
      if (separator < 0) {
        continue;
      }
      const name = declaration.slice(0, separator).trim();
      if (name.startsWith('--')) {
        theme.set(name, declaration.slice(separator + 1).trim());
      }
    }
  }
  const utilities = new Set(
    [...text.matchAll(/@utility\s+([a-z0-9-]+(?:-\*)?)\s*\{/gu)].map((match) => match[1] ?? ''),
  );
  return { theme, utilities };
}

/**
 * tokens.css가 tokens.json과 맞는지 비교하고 실패를 돌려준다.
 * @codocs [[피그마 일치 검사:토큰 작성]]
 * @param tokens tokens.json 토큰 표
 * @param css tokens.css를 읽은 결과
 * @returns 실패 메시지(맞으면 빈 목록)
 */
export function compareTokenValues(tokens: FigmaTokens, css: TokensCss): string[] {
  const failures: string[] = [];
  const known = new Set<string>();

  for (const token of tokens.variables.values()) {
    const [name, ...derived] = cssNamesOf(tokens, token.path);
    if (name === undefined) {
      continue;
    }
    known.add(name);
    const actual = css.theme.get(name);
    if (actual === undefined) {
      failures.push(`${token.path}: tokens.css에 ${name}이 없다`);
      continue;
    }
    const target = aliasTarget(token);
    if (target !== undefined) {
      const [targetName] = cssNamesOf(tokens, target);
      if (actual !== `var(${targetName ?? ''})`) {
        failures.push(
          `${token.path}: 별칭 ${target} → 기대 ${name}: var(${targetName ?? ''}), tokens.css ${actual}`,
        );
      }
    } else {
      const failure = valueFailure(tokens, token.path, css, actual);
      if (failure !== undefined) {
        failures.push(`${token.path}: ${failure}`);
      }
    }
    for (const alias of derived) {
      known.add(alias);
      const value = css.theme.get(alias);
      if (value !== `var(${name})`) {
        failures.push(
          `${token.path}: ${alias}는 var(${name})이어야 한다(tokens.css ${value ?? '없음'})`,
        );
      }
    }
  }

  for (const paint of tokens.paints.values()) {
    if (paint.kind === 'material') {
      if (!css.utilities.has(paint.utility)) {
        failures.push(`칠 스타일 ${paint.name}: tokens.css에 @utility ${paint.utility}가 없다`);
      }
      continue;
    }
    known.add(paint.cssName);
    const actual = css.theme.get(paint.cssName);
    if (actual === undefined) {
      failures.push(`칠 스타일 ${paint.name}: tokens.css에 ${paint.cssName}이 없다`);
      continue;
    }
    if (paint.kind === 'solid') {
      const target = aliasTarget(paint.token);
      if (target !== undefined) {
        const [targetName] = cssNamesOf(tokens, target);
        if (actual !== `var(${targetName ?? ''})`) {
          failures.push(
            `칠 스타일 ${paint.name}: 별칭 ${target} → 기대 var(${targetName ?? ''}), tokens.css ${actual}`,
          );
        }
      } else {
        const expected = expectedOfValue('color', paint.token.value, paint.name);
        if (!matchesExpected(expected, resolveCss(actual, css.theme))) {
          failures.push(`칠 스타일 ${paint.name}: 값이 다르다(tokens.css ${actual})`);
        }
      }
    }
  }

  for (const effect of tokens.effects.values()) {
    for (const name of [effect.shadow?.cssName, effect.backdropBlur, effect.blur]) {
      if (name === undefined || name === null) {
        continue;
      }
      known.add(name);
      if (!css.theme.has(name)) {
        failures.push(`효과 스타일 ${effect.name}: tokens.css에 ${name}이 없다`);
      }
    }
  }

  for (const [style, utility] of tokens.texts) {
    if (!css.utilities.has(utility)) {
      failures.push(`글자 스타일 ${style}: tokens.css에 @utility ${utility}가 없다`);
    }
  }

  for (const name of css.theme.keys()) {
    if (!known.has(name)) {
      failures.push(`${name}: tokens.json에 없는 토큰이다`);
    }
  }
  return failures;
}

/**
 * 별칭이 아닌 변수의 값을 비교한다.
 * @param tokens 토큰 표
 * @param path 변수 경로
 * @param css tokens.css
 * @param actual tokens.css에 쓴 값
 * @returns 실패 이유, 맞으면 undefined
 */
function valueFailure(
  tokens: FigmaTokens,
  path: string,
  css: TokensCss,
  actual: string,
): string | undefined {
  const token = resolveToken(tokens, path);
  const resolved = resolveCss(actual, css.theme);
  if (token.type === 'fontFamily' || token.type === 'string') {
    const [first = ''] = splitTopLevel(resolved);
    const family = first.replace(/^['"]|['"]$/gu, '').trim();
    return family === token.value
      ? undefined
      : `값이 다르다(피그마 ${JSON.stringify(token.value)}, tokens.css ${actual})`;
  }
  let expected;
  try {
    expected = expectedOfValue(token.type, token.value, path, path.startsWith('opacity/'));
  } catch (error) {
    return `비교할 수 없다: ${error instanceof Error ? error.message : String(error)}`;
  }
  // 불투명도는 tokens.css에 백분율(`50%`)로 쓴다.
  const comparable =
    expected.kind === 'number' && resolved.endsWith('%')
      ? String(Number.parseFloat(resolved) / 100)
      : resolved;
  if (expected.kind === 'color' && parseColor(comparable) === null) {
    return `색 값을 읽을 수 없다(tokens.css ${actual})`;
  }
  return matchesExpected(expected, comparable)
    ? undefined
    : `값이 다르다(피그마 ${JSON.stringify(token.value)}, tokens.css ${actual})`;
}

/**
 * `var()`를 `@theme`의 값으로 바꿔 끝까지 푼다.
 * @param value CSS 값
 * @param theme `@theme` 사용자 속성
 * @returns 푼 값(풀 수 없는 `var()`는 그대로)
 */
export function resolveCss(value: string, theme: ReadonlyMap<string, string>): string {
  let current = value;
  for (let depth = 0; depth < 20; depth += 1) {
    const next = current.replace(
      /var\((--[a-z0-9-]+)\)/gu,
      (whole, name: string) => theme.get(name) ?? whole,
    );
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}

/**
 * 여는 중괄호 바로 뒤부터 짝이 맞는 닫는 중괄호 앞까지를 돌려준다.
 * @param text CSS
 * @param start 여는 중괄호 다음 위치
 * @returns 블록 안쪽 글자
 */
function blockBody(text: string, start: number): string {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index);
      }
    }
  }
  return text.slice(start);
}

/**
 * 블록 안쪽을 괄호 밖의 `;`로 나눈다.
 * @param body 블록 안쪽 글자
 * @returns 선언 목록
 */
function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of body) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (character === ';' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim() !== '') {
    parts.push(current.trim());
  }
  return parts;
}
