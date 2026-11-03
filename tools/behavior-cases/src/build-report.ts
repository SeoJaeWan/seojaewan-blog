import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { loadTable } from './load-table.ts';
import { defaultReportDir, pageDir } from './paths.ts';
import { type JsonReport, readReportedCases } from './playwright-results.ts';
import type { CaseResult } from './table-types.ts';

// @codocs [[테스트 작성 규칙:E2E]]
// CI가 모든 케이스를 돌린 Playwright JSON 보고서와 trace를 표 데이터에 붙여 정적 결과 페이지를 만든다.
// trace zip은 페이지와 함께 올려 trace.playwright.dev 뷰어가 그 주소로 연다.
const { values } = parseArgs({
  options: {
    results: { type: 'string' },
    out: { type: 'string', default: defaultReportDir },
    commit: { type: 'string', default: process.env.GITHUB_SHA ?? 'local' },
    'run-url': { type: 'string' },
  },
});

if (values.results === undefined || !existsSync(values.results)) {
  throw new Error('--results에 Playwright JSON 보고서 경로를 준다');
}

const outDir = path.resolve(values.out);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(path.join(outDir, 'traces'), { recursive: true });

// Playwright가 쓴 보고서다.
const report = JSON.parse(readFileSync(values.results, 'utf8')) as JsonReport;
const results = new Map<string, CaseResult>();
for (const [token, reported] of readReportedCases(report)) {
  let trace: string | null = null;
  if (reported.tracePath !== null && existsSync(reported.tracePath)) {
    trace = `traces/${token.replace(/[^\w-]/gu, '_')}.zip`;
    copyFileSync(reported.tracePath, path.join(outDir, trace));
  }
  results.set(token, {
    status: reported.status,
    durationMs: reported.durationMs,
    error: reported.error,
    trace,
  });
}

const { table } = await loadTable({
  mode: 'report',
  results,
  run: { commit: values.commit, url: values['run-url'] ?? null },
});
writeFileSync(path.join(outDir, 'table.json'), JSON.stringify(table));
for (const file of ['index.html', 'app.js', 'style.css']) {
  copyFileSync(path.join(pageDir, file), path.join(outDir, file));
}
// GitHub Pages가 Jekyll로 처리하지 않게 한다.
writeFileSync(path.join(outDir, '.nojekyll'), '');
console.log(
  `결과 페이지: ${outDir} (케이스 ${table.totals.cases}, 통과 ${table.totals.passed}, 실패 ${table.totals.failed})`,
);
