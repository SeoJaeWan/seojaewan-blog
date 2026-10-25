import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { nodeModulesDir, sourceDir } from '../package-paths.ts';
import { fontFacesToCss, parseFontFaces } from './font-face-css.ts';

// 사용법: node scripts/fonts/generate-fonts.ts [--check]
// --check는 파일을 쓰지 않고, src/의 생성 CSS가 패키지 CSS에서 만든 결과와 다르면 실패한다.
const CHECK_FLAG = '--check';

/** woff2만 가리키는 CSS를 만드는 웹 폰트 하나 */
export type FontSource = {
  /** src/ 아래 생성 파일 이름 */
  output: string;
  /** 원본 CSS가 있는 패키지 이름 */
  packageName: string;
  /** 패키지 안 CSS 폴더 */
  cssDir: string;
  /** 그 CSS 기준 woff2 폴더 */
  woff2Dir: string;
  /** 쓰는 굵기의 CSS 파일 */
  files: readonly string[];
};

// @codocs [[디자인 기반:서체]]
// 굵기는 Regular·SemiBold·Bold만 쓰고(피그마가 제공하는 Pretendard 굵기와 같다), 코드 블록 서체는 Regular만 쓴다.
export const fontSources: readonly FontSource[] = [
  {
    output: 'pretendard.css',
    packageName: 'pretendard',
    cssDir: 'pretendard/dist/web/static',
    woff2Dir: 'woff2-dynamic-subset',
    files: ['Pretendard-Regular.css', 'Pretendard-SemiBold.css', 'Pretendard-Bold.css'],
  },
  {
    output: 'open-sans.css',
    packageName: '@fontsource/open-sans',
    cssDir: '@fontsource/open-sans',
    woff2Dir: 'files',
    files: ['400.css', '600.css', '700.css'],
  },
  {
    output: 'cascadia-mono.css',
    packageName: '@fontsource/cascadia-mono',
    cssDir: '@fontsource/cascadia-mono',
    woff2Dir: 'files',
    files: ['400.css'],
  },
];

if (import.meta.main) {
  main();
}

/**
 * 웹 폰트 패키지 CSS에서 src/의 woff2 전용 CSS를 만들거나, 만든 결과와 같은지 확인한다.
 * 패키지 CSS는 woff 대체 파일도 가리켜 빌드에 woff가 딸려 들어가므로 woff2만 남긴다.
 * @codocs [[디자인 기반:서체]]
 */
function main(): void {
  const isCheck = process.argv.includes(CHECK_FLAG);
  for (const source of fontSources) {
    const css = fontSourceCss(source);
    const outputPath = path.join(sourceDir, source.output);
    const name = `src/${source.output}`;
    if (isCheck) {
      const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '';
      if (current !== css) {
        console.error(
          `[fonts] ${name}가 ${source.packageName} 패키지와 맞지 않는다. ` +
            '`pnpm --filter @seojaewan/design-system generate:fonts`로 다시 만들어 커밋한다.',
        );
        process.exitCode = 1;
        continue;
      }
      console.log(`[fonts] ${name}가 ${source.packageName} 패키지와 맞다.`);
      continue;
    }
    writeFileSync(outputPath, css);
    console.log(`[fonts] ${name}를 만들었다.`);
  }
}

/**
 * 웹 폰트 하나의 패키지 CSS를 읽어 woff2만 가리키는 CSS를 만든다.
 * @param source 웹 폰트
 * @returns 생성 파일 내용
 */
export function fontSourceCss(source: FontSource): string {
  const cssDir = path.join(nodeModulesDir, ...source.cssDir.split('/'));
  const faces = source.files.flatMap((file) =>
    parseFontFaces(readFileSync(path.join(cssDir, file), 'utf8'), source.woff2Dir),
  );
  const fileDir = path
    .relative(sourceDir, path.join(cssDir, source.woff2Dir))
    .split(path.sep)
    .join('/');
  return fontFacesToCss(faces, fileDir, source.packageName);
}
