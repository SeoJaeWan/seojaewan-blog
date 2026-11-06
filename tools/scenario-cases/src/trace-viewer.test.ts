import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { copyTraceViewer, TRACE_VIEWER_DIR } from './trace-viewer.ts';

const pageScript = path.join(import.meta.dirname, '..', 'page', 'app.js');

// @codocs [[테스트 작성 규칙:E2E]]
describe('copyTraceViewer', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Playwright Trace Viewer를 보고서의 trace 폴더에 복사한다', () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'scenario-cases-report-'));
    dirs.push(outDir);

    const target = copyTraceViewer(outDir);

    expect(target).toBe(path.join(outDir, TRACE_VIEWER_DIR));
    expect(readFileSync(path.join(target, 'index.html'), 'utf8')).toContain('Trace Viewer');
    // trace zip은 뷰어의 service worker가 같은 주소에서 받는다.
    expect(existsSync(path.join(target, 'sw.bundle.js'))).toBe(true);
  });

  it('보고서의 실행해보기는 외부 뷰어가 아니라 보고서 안의 뷰어로 연다', () => {
    const script = readFileSync(pageScript, 'utf8');

    expect(script).toContain(`'${TRACE_VIEWER_DIR}/?trace='`);
    expect(script).not.toContain('trace.playwright.dev');
  });
});
