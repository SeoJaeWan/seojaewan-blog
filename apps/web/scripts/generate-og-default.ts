// @codocs [[SEO와 공유 미리보기:공유 미리보기 이미지]]
// 커버가 없는 항목과 첫 화면의 공유 그림 `public/og-default.png`(1200×630)를 만든다.
// 배경화면 Bloom(디자인 시스템 자산)을 꽉 채우고 가운데에 `seojaewan.com`을 쓴다. 글자의 서체·크기·굵기·색·그림자는
// 디자인 시스템 토큰(`tokens.css`)의 값이고, 서체 파일은 디자인 시스템의 웹 폰트 CSS를 그대로 불러온다.
// Playwright Chromium으로 그 화면을 그려 PNG로 저장한다. Bloom이나 토큰이 바뀌면 다시 실행해 커밋한다.
//
// 실행: `pnpm --filter @seojaewan/web generate:og-default`
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/** 공유 그림 크기. Open Graph가 권하는 1.91:1 크기이고 `DEFAULT_SHARE_IMAGE`와 같다 */
const IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** 그림에 쓰는 글자 */
const LABEL = 'seojaewan.com';

/** 글자에 쓰는 토큰 값 */
type TokenValues = Record<keyof typeof TOKEN_NAMES, string>;

const designSystemSource = new URL('../../../packages/design-system/src/', import.meta.url);
const tokensFile = new URL('tokens.css', designSystemSource);
const fontCssFile = new URL('open-sans.css', designSystemSource);
const wallpaperFile = new URL('assets/images/wallpaper-bloom.webp', designSystemSource);
const outputFile = new URL('../public/og-default.png', import.meta.url);

/** 글자에 쓰는 토큰 이름. 서체, 글자 크기·줄 높이(가장 큰 Display), 굵기, 색, 바탕화면 아이콘 이름과 같은 그림자다 */
const TOKEN_NAMES = {
  fontFamily: '--font-family-base',
  fontSize: '--font-size-display',
  lineHeight: '--font-line-height-display',
  fontWeight: '--font-weight-semibold',
  color: '--color-white',
  textShadow: '--shadow-text-elevation-desktop-label',
} as const;

const html = buildHtml(readTokens(readFileSync(tokensFile, 'utf8')));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: IMAGE_SIZE, deviceScaleFactor: 1 });
  // 파일 주소(서체, 배경화면)를 읽도록 파일 주소의 빈 문서에서 연다.
  await page.goto(new URL('.', designSystemSource).href);
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({ path: fileURLToPath(outputFile), type: 'png' });
  console.log(`[og-default] ${fileURLToPath(outputFile)}`);
} finally {
  await browser.close();
}

/**
 * 공유 그림 화면의 HTML. 배경화면을 꽉 채우고 가운데에 글자를 쓴다.
 * @param tokens 글자에 쓰는 토큰 값
 * @returns HTML
 */
function buildHtml(tokens: TokenValues): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="${fontCssFile.href}" />
    <style>
      html, body { margin: 0; }
      body {
        width: ${String(IMAGE_SIZE.width)}px;
        height: ${String(IMAGE_SIZE.height)}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: url('${wallpaperFile.href}') center / cover no-repeat;
      }
      p {
        margin: 0;
        font-family: ${tokens.fontFamily};
        font-size: ${tokens.fontSize};
        line-height: ${tokens.lineHeight};
        font-weight: ${tokens.fontWeight};
        color: ${tokens.color};
        text-shadow: ${tokens.textShadow};
      }
    </style>
  </head>
  <body><p>${LABEL}</p></body>
</html>`;
}

/**
 * `tokens.css`에서 글자에 쓰는 토큰 값을 읽는다. 토큰이 없으면 멈춘다.
 * @param css `tokens.css` 내용
 * @returns 토큰 값
 */
function readTokens(css: string): TokenValues {
  return {
    fontFamily: readToken(css, TOKEN_NAMES.fontFamily),
    fontSize: readToken(css, TOKEN_NAMES.fontSize),
    lineHeight: readToken(css, TOKEN_NAMES.lineHeight),
    fontWeight: readToken(css, TOKEN_NAMES.fontWeight),
    color: readToken(css, TOKEN_NAMES.color),
    textShadow: readToken(css, TOKEN_NAMES.textShadow),
  };
}

/**
 * `tokens.css`에서 토큰 하나의 값을 읽는다. 없으면 멈춘다.
 * @param css `tokens.css` 내용
 * @param name 토큰 이름(`--` 포함)
 * @returns 토큰 값
 */
function readToken(css: string, name: string): string {
  const match = new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'mu').exec(css);
  if (match?.[1] === undefined) {
    throw new Error(`[og-default] tokens.css에 ${name}이 없다`);
  }
  return match[1].trim();
}
