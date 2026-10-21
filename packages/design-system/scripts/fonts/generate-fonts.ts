import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { pretendardCssPath, pretendardPackageCssDir } from '../package-paths.ts';
import { fontFacesToCss, parseFontFaces } from './font-face-css.ts';

// 사용법: node scripts/fonts/generate-fonts.ts [--check]
// --check는 파일을 쓰지 않고, src/pretendard.css가 패키지 CSS에서 만든 결과와 다르면 실패한다.
const CHECK_FLAG = '--check';
// 쓰는 굵기다. 피그마가 제공하는 Pretendard 굵기와 같다.
export const PRETENDARD_WEIGHTS = ['Regular', 'SemiBold', 'Bold'] as const;

if (import.meta.main) {
  main();
}

/**
 * pretendard 패키지 CSS에서 src/pretendard.css를 만들거나, 만든 결과와 같은지 확인한다.
 * @codocs [[디자인 기반:서체]]
 */
function main(): void {
  const css = pretendardCss();
  const cssName = 'src/pretendard.css';
  if (process.argv.includes(CHECK_FLAG)) {
    const current = existsSync(pretendardCssPath) ? readFileSync(pretendardCssPath, 'utf8') : '';
    if (current !== css) {
      console.error(
        `[fonts] ${cssName}가 pretendard 패키지와 맞지 않는다. ` +
          '`pnpm --filter @seojaewan/design-system generate:fonts`로 다시 만들어 커밋한다.',
      );
      process.exitCode = 1;
      return;
    }
    console.log(`[fonts] ${cssName}가 pretendard 패키지와 맞다.`);
    return;
  }
  writeFileSync(pretendardCssPath, css);
  console.log(`[fonts] ${cssName}를 만들었다.`);
}

/**
 * 쓰는 굵기의 패키지 CSS를 읽어 woff2만 가리키는 CSS를 만든다.
 * @returns src/pretendard.css 내용
 */
export function pretendardCss(): string {
  const faces = PRETENDARD_WEIGHTS.flatMap((weight) =>
    parseFontFaces(
      readFileSync(path.join(pretendardPackageCssDir, `Pretendard-${weight}.css`), 'utf8'),
    ),
  );
  const fileDir = path
    .relative(
      path.dirname(pretendardCssPath),
      path.join(pretendardPackageCssDir, 'woff2-dynamic-subset'),
    )
    .split(path.sep)
    .join('/');
  return fontFacesToCss(faces, fileDir);
}
