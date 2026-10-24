// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { sourceDir } from '../package-paths.ts';
import { FontCssError, fontFacesToCss, parseFontFaces } from './font-face-css.ts';
import { fontSourceCss, fontSources } from './generate-fonts.ts';

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
    const css = fontFacesToCss(
      parseFontFaces(PACKAGE_CSS, 'woff2-dynamic-subset'),
      '../fonts',
      'pretendard',
    );
    expect(css).toContain("src: url(../fonts/Pretendard-SemiBold.subset.0.woff2) format('woff2');");
    expect(css).not.toContain('.woff)');
  });

  it('글자 범위(unicode-range)마다 규칙을 하나씩 남겨 화면에 나온 한글의 파일만 받게 한다', () => {
    const faces = parseFontFaces(PACKAGE_CSS, 'woff2-dynamic-subset');
    expect(faces.map((face) => face.unicodeRange)).toEqual(['U+ac00-ac0b, U+ac0d', 'U+d723-d728']);
    expect(faces.every((face) => face.weight === '600' && face.family === "'Pretendard'")).toBe(
      true,
    );
  });

  it('woff2 파일이 없는 @font-face는 실패한다', () => {
    expect(() =>
      parseFontFaces(
        "@font-face { font-family: 'P'; src: url(./a.woff) format('woff'); }",
        'files',
      ),
    ).toThrow(FontCssError);
  });

  it('src/의 웹 폰트 CSS(Pretendard, Open Sans, Cascadia Mono)가 패키지 CSS와 맞고 woff2만 가리킨다', () => {
    for (const source of fontSources) {
      const css = readFileSync(path.join(sourceDir, source.output), 'utf8');
      expect(css).toBe(fontSourceCss(source));
      expect(css).not.toContain('.woff)');
    }
  });

  it('본문 서체는 Regular·SemiBold·Bold만, 코드 블록 서체는 Regular만 담는다', () => {
    expect(weights('pretendard.css')).toEqual(['400', '600', '700']);
    expect(weights('open-sans.css')).toEqual(['400', '600', '700']);
    expect(weights('cascadia-mono.css')).toEqual(['400']);
  });

  it('Open Sans의 모든 @font-face에 서체 높이 덮어쓰기가 있고 다른 서체에는 없다', () => {
    const openSans = readFileSync(path.join(sourceDir, 'open-sans.css'), 'utf8');
    const count = (openSans.match(/@font-face/gu) ?? []).length;
    expect(count).toBeGreaterThan(0);
    expect((openSans.match(/ascent-override: 104.7%;/gu) ?? []).length).toBe(count);
    expect((openSans.match(/descent-override: 26.05%;/gu) ?? []).length).toBe(count);
    for (const output of ['pretendard.css', 'cascadia-mono.css']) {
      expect(readFileSync(path.join(sourceDir, output), 'utf8')).not.toContain('-override');
    }
  });
});

/**
 * 생성 CSS에 담긴 굵기를 모은다.
 * @param output src/ 아래 생성 파일 이름
 * @returns 정렬한 굵기 목록
 */
function weights(output: string): string[] {
  const css = readFileSync(path.join(sourceDir, output), 'utf8');
  const found = [...css.matchAll(/font-weight: (\d+);/gu)].map((match) => match[1] ?? '');
  return [...new Set(found)].sort();
}
