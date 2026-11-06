import { cpSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/** 보고서 안에서 Trace Viewer를 두는 폴더. 실행해보기는 `trace/?trace=<zip 주소>`를 연다(page/app.js) */
export const TRACE_VIEWER_DIR = 'trace';

/**
 * 설치된 Playwright 패키지에 들어 있는 Trace Viewer 정적 파일 폴더를 찾는다.
 * `@playwright/test` → `playwright` → `playwright-core` 순서로 따라가 같은 버전의 뷰어를 쓴다.
 * @returns 뷰어 폴더(index.html, sw.bundle.js가 있다)
 */
export function traceViewerSourceDir(): string {
  const fromTool = createRequire(import.meta.url);
  const playwrightTest = fromTool.resolve('@playwright/test/package.json');
  const playwright = createRequire(playwrightTest).resolve('playwright/package.json');
  const core = createRequire(playwright).resolve('playwright-core/package.json');
  return path.join(path.dirname(core), 'lib', 'vite', 'traceViewer');
}

/**
 * 보고서 폴더에 Trace Viewer를 복사한다. 보고서가 Cloudflare Access(로그인) 뒤에 있어
 * 외부 뷰어(trace.playwright.dev)는 trace zip을 받지 못하므로, 보고서와 같은 주소에서 연다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param outDir 보고서 폴더
 * @returns 복사한 폴더
 */
export function copyTraceViewer(outDir: string): string {
  const target = path.join(outDir, TRACE_VIEWER_DIR);
  cpSync(traceViewerSourceDir(), target, { recursive: true });
  return target;
}
