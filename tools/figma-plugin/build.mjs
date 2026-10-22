import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as esbuild from 'esbuild';

// 플러그인 본체(src/code.ts → dist/code.js)와 UI(src/ui → dist/ui.html, 스크립트 인라인)를 만든다.
// 피그마 MCP(use_figma)용 진입점(src/mcp-entry.ts → dist/use-figma-export.js)도 같은 검사·내보내기 코드로 만든다.
// use-figma-export.js는 전역 SeojaewanFigmaExport를 만드는 스크립트 하나이고, use_figma에는 이 내용 뒤에
// `return await SeojaewanFigmaExport.runMcpExport({...});`를 붙여 넘긴다. 토큰은 use-figma-tokens.js
// (전역 SeojaewanFigmaTokens, `return await SeojaewanFigmaTokens.runMcpTokens();`)로 나눴다.
// `--watch`를 주면 바뀔 때마다 다시 만든다.

const rootDir = import.meta.dirname;
const distDir = path.join(rootDir, 'dist');
const UI_SCRIPT_MARKER = '<!-- UI_SCRIPT -->';
// 피그마 플러그인 샌드박스가 지원하는 문법 수준에 맞춘다.
const TARGET = 'es2017';

const isWatch = process.argv.includes('--watch');

const codeOptions = {
  entryPoints: [path.join(rootDir, 'src/code.ts')],
  outfile: path.join(distDir, 'code.js'),
  bundle: true,
  format: 'iife',
  target: TARGET,
  logLevel: 'info',
};

const mcpOptions = {
  entryPoints: [path.join(rootDir, 'src/mcp-entry.ts')],
  outfile: path.join(distDir, 'use-figma-export.js'),
  bundle: true,
  format: 'iife',
  globalName: 'SeojaewanFigmaExport',
  target: TARGET,
  // use_figma 코드는 5만 자까지라 줄인다.
  minify: true,
  // 한글을  이스케이프로 늘리지 않는다.
  charset: 'utf8',
  logLevel: 'info',
};

const mcpTokensOptions = {
  ...mcpOptions,
  entryPoints: [path.join(rootDir, 'src/mcp-tokens.ts')],
  outfile: path.join(distDir, 'use-figma-tokens.js'),
  globalName: 'SeojaewanFigmaTokens',
};

const uiOptions = {
  entryPoints: [path.join(rootDir, 'src/ui/ui.ts')],
  bundle: true,
  format: 'iife',
  target: TARGET,
  write: false,
  logLevel: 'info',
  plugins: [{ name: 'inline-ui-html', setup: setupInlineUi }],
};

await mkdir(distDir, { recursive: true });

if (isWatch) {
  const contexts = await Promise.all([
    esbuild.context(codeOptions),
    esbuild.context(mcpOptions),
    esbuild.context(mcpTokensOptions),
    esbuild.context(uiOptions),
  ]);
  await Promise.all(contexts.map((context) => context.watch()));
} else {
  await Promise.all([
    esbuild.build(codeOptions),
    esbuild.build(mcpOptions),
    esbuild.build(mcpTokensOptions),
    esbuild.build(uiOptions),
  ]);
}

/**
 * UI 스크립트 빌드가 끝나면 ui.html에 스크립트를 넣어 dist/ui.html로 쓴다.
 * @param build esbuild 플러그인 빌드 객체
 */
function setupInlineUi(build) {
  build.onEnd(async (result) => {
    const script = result.outputFiles?.[0]?.text;
    if (result.errors.length > 0 || script === undefined) {
      return;
    }
    const template = await readFile(path.join(rootDir, 'src/ui/ui.html'), 'utf8');
    const inlined = template.replace(
      UI_SCRIPT_MARKER,
      () => `<script>${script.replaceAll('</script', '<\\/script')}</script>`,
    );
    await writeFile(path.join(distDir, 'ui.html'), inlined);
  });
}
