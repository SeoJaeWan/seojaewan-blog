// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const motionCss = readFileSync(new URL('motion.css', import.meta.url), 'utf8');
const tokensCss = readFileSync(new URL('tokens.css', import.meta.url), 'utf8');
const stylelintConfig = new URL('../../../stylelint.config.mjs', import.meta.url);
const KEYFRAMES_CODE = '@keyframes probe { from { opacity: 0; } }';
const UTILITY_CODE = '@utility motion-probe { opacity: 1; }';

/**
 * 저장소 Stylelint 설정(stylelint.config.mjs)으로 이 폴더의 CSS 파일 자리에서 코드를 검사한다.
 * @param code 검사할 CSS
 * @param fileName src 안의 파일 이름
 * @returns at-rule-disallowed-list 경고 수
 */
async function disallowedAtRules(code: string, fileName: string): Promise<number> {
  const { results } = await stylelint.lint({
    code,
    codeFilename: fileURLToPath(new URL(fileName, import.meta.url)),
    configFile: fileURLToPath(stylelintConfig),
    cwd: fileURLToPath(new URL('.', stylelintConfig)),
  });
  return (results[0]?.warnings ?? []).filter(
    (warning) => warning.rule === 'at-rule-disallowed-list',
  ).length;
}

// @codocs [[피그마 연동:모션 클래스]]
// @codocs [[피그마 연동:토큰 사용 강제]]
describe('스타일링', () => {
  it('@keyframes는 motion.css에서만 정의할 수 있다', async () => {
    await expect(disallowedAtRules(KEYFRAMES_CODE, 'motion.css')).resolves.toBe(0);
    await expect(disallowedAtRules(KEYFRAMES_CODE, 'tokens.css')).resolves.toBe(1);
    await expect(disallowedAtRules(KEYFRAMES_CODE, 'theme.css')).resolves.toBe(1);
  });

  it('motion-* 클래스(@utility)는 motion.css에서 정의하고 다른 CSS에서는 막는다', async () => {
    await expect(disallowedAtRules(UTILITY_CODE, 'motion.css')).resolves.toBe(0);
    await expect(disallowedAtRules(UTILITY_CODE, 'theme.css')).resolves.toBe(1);
  });

  it('motion.css에서도 토큰(@theme)은 정의할 수 없다', async () => {
    await expect(disallowedAtRules('@theme { --x: 1px; }', 'motion.css')).resolves.toBe(1);
  });

  it('motion.css의 @utility 이름은 모두 motion-으로 시작한다', () => {
    const names = [...motionCss.matchAll(/^@utility\s+([^\s{]+)/gmu)].map((match) => match[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => name?.startsWith('motion-') !== true)).toEqual([]);
  });
});

// @codocs [[피그마 연동:모션 클래스]]
describe('모션 클래스', () => {
  it('시간·이징·지연은 tokens.css에 있는 var(--motion-*) 토큰으로 쓴다', () => {
    const values = [
      ...motionCss.matchAll(
        /^\s*(?:transition|animation)-(?:duration|timing-function|delay):\s*([^;]+);/gmu,
      ),
    ].map((match) => match[1]?.trim() ?? '');
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      const variable = /^var\((--motion-[a-z0-9-]+)\)$/u.exec(value)?.[1];
      expect(variable, value).toBeDefined();
      expect(tokensCss).toContain(`  ${variable ?? ''}: `);
    }
  });

  it('동작 줄이기(prefers-reduced-motion: reduce)는 motion.css 한 곳에서 처리한다', () => {
    expect(motionCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
