// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { pretendardCssPath } from '../package-paths.ts';
import { FontCssError, fontFacesToCss, parseFontFaces } from './font-face-css.ts';
import { pretendardCss } from './generate-fonts.ts';

const PACKAGE_CSS = `/* [0] */
@font-face {
	font-family: 'Pretendard';
	font-style: normal;
	font-display: swap;
	font-weight: 600;
	src: url(./woff2-dynamic-subset/Pretendard-SemiBold.subset.0.woff2) format('woff2'), url(./woff-dynamic-subset/Pretendard-SemiBold.subset.0.woff) format('woff');
	unicode-range: U+ac00-ac0b, U+ac0d;
}
/* [1] */
@font-face {
	font-family: 'Pretendard';
	font-style: normal;
	font-display: swap;
	font-weight: 600;
	src: url(./woff2-dynamic-subset/Pretendard-SemiBold.subset.1.woff2) format('woff2'), url(./woff-dynamic-subset/Pretendard-SemiBold.subset.1.woff) format('woff');
	unicode-range: U+d723-d728;
}`;

// @codocs [[디자인 기반:서체]]
describe('서체', () => {
  it('Pretendard @font-face는 woff 없이 woff2 파일만 가리킨다', () => {
    const css = fontFacesToCss(parseFontFaces(PACKAGE_CSS), '../fonts');
    expect(css).toContain("src: url(../fonts/Pretendard-SemiBold.subset.0.woff2) format('woff2');");
    expect(css).not.toContain('.woff)');
  });

  it('글자 범위(unicode-range)마다 규칙을 하나씩 남겨 화면에 나온 한글의 파일만 받게 한다', () => {
    const faces = parseFontFaces(PACKAGE_CSS);
    expect(faces.map((face) => face.unicodeRange)).toEqual(['U+ac00-ac0b, U+ac0d', 'U+d723-d728']);
    expect(faces.every((face) => face.weight === '600' && face.family === "'Pretendard'")).toBe(
      true,
    );
  });

  it('woff2 파일이 없는 @font-face는 실패한다', () => {
    expect(() =>
      parseFontFaces("@font-face { font-family: 'P'; src: url(./a.woff) format('woff'); }"),
    ).toThrow(FontCssError);
  });

  it('src/pretendard.css가 pretendard 패키지 CSS와 맞고 Regular·SemiBold·Bold만 담는다', () => {
    const css = readFileSync(pretendardCssPath, 'utf8');
    expect(css).toBe(pretendardCss());
    const weights = new Set([...css.matchAll(/font-weight: (\d+);/gu)].map((match) => match[1]));
    expect([...weights].sort()).toEqual(['400', '600', '700']);
  });
});
