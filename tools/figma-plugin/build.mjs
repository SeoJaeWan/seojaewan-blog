import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as esbuild from 'esbuild';

// 플러그인 본체(src/code.ts → dist/code.js)와 UI(src/ui → dist/ui.html, 스크립트 인라인)를 만든다.
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
  const contexts = await Promise.all([esbuild.context(codeOptions), esbuild.context(uiOptions)]);
  await Promise.all(contexts.map((context) => context.watch()));
} else {
  await Promise.all([esbuild.build(codeOptions), esbuild.build(uiOptions)]);
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
