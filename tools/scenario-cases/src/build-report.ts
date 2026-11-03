import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { type HistoryRun, runSummaryOf } from './build-table.ts';
import { mergeHistory } from './history.ts';
import { loadTable } from './load-table.ts';
import { defaultReportDir, pageDir } from './paths.ts';
import { checksOf, type JsonReport, readReportedCases } from './playwright-results.ts';
import { readBehaviors } from './read-behaviors.ts';
import type { CaseResult, ResultStatus } from './table-types.ts';

// @codocs [[테스트 작성 규칙:E2E]]
// CI가 모든 케이스를 돌린 Playwright JSON 보고서와 trace를 화면 데이터에 붙여 정적 보고서를 만든다.
// trace zip은 보고서와 함께 올려 실행해보기가 trace.playwright.dev 뷰어로 그 주소를 연다.
// 실행 기록은 앞서 올린 보고서의 history.json에 이번 실행을 더해 쌓는다.
const { values } = parseArgs({
  options: {
    results: { type: 'string' },
    out: { type: 'string', default: defaultReportDir },
    commit: { type: 'string', default: process.env.GITHUB_SHA ?? 'local' },
    'run-url': { type: 'string' },
    history: { type: 'string' },
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
const behaviors = await readBehaviors();
const caseByToken = new Map(
  behaviors.flatMap(
    /**
     * 행위의 케이스마다 고르는 표시와 케이스 열쇠·기대 결과를 짝짓는다.
     * @param behavior 행위 정의
     * @returns 고르는 표시와 케이스 정보
     */
    (behavior) =>
      behavior.cases.map((source, index) => [
        `[${behavior.id}#${String(index + 1)}]`,
        { key: `${behavior.id}/${source.id}`, expected: source.expected },
      ]),
  ),
);

const results = new Map<string, CaseResult>();
const currentResults: Record<string, ResultStatus> = {};
for (const [token, reported] of readReportedCases(report)) {
  const name = token.replace(/[^\w-]/gu, '_');
  let trace: string | null = null;
  if (reported.tracePath !== null && existsSync(reported.tracePath)) {
    trace = `traces/${name}.zip`;
    copyFileSync(reported.tracePath, path.join(outDir, trace));
  }
  const known = caseByToken.get(token);
  results.set(token, {
    status: reported.status,
    durationMs: reported.durationMs,
    error: reported.error,
    trace,
    checks: checksOf(known?.expected ?? [], reported.steps),
  });
  if (known !== undefined) {
    currentResults[known.key] = reported.status;
  }
}

const statuses = Object.values(currentResults);
const current: HistoryRun = {
  commit: values.commit,
  url: values['run-url'] ?? null,
  time: report.stats?.startTime ?? new Date().toISOString(),
  durationMs: Math.round(report.stats?.duration ?? 0),
  passed: statuses.filter((status) => status === 'passed' || status === 'flaky').length,
  failed: statuses.filter(
    (status) => status !== 'passed' && status !== 'flaky' && status !== 'skipped',
  ).length,
  results: currentResults,
};
let previous: unknown = [];
if (values.history !== undefined && existsSync(values.history)) {
  try {
    previous = JSON.parse(readFileSync(values.history, 'utf8'));
  } catch {
    console.warn('지난 실행 기록을 읽지 못해 이번 실행부터 쌓는다');
  }
}
const history = mergeHistory(previous, current);
const run = runSummaryOf(current);

const { table } = await loadTable({ mode: 'report', results, run });
writeFileSync(path.join(outDir, 'table.json'), JSON.stringify(table));
writeFileSync(path.join(outDir, 'history.json'), JSON.stringify(history));
for (const file of ['index.html', 'app.js', 'style.css']) {
  copyFileSync(path.join(pageDir, file), path.join(outDir, file));
}
// GitHub Pages가 Jekyll로 처리하지 않게 한다.
writeFileSync(path.join(outDir, '.nojekyll'), '');
console.log(
  `시나리오 케이스 보고서: ${outDir} (케이스 ${String(table.totals.cases)}, 통과 ${String(table.totals.passed)}, 실패 ${String(table.totals.failed)}, 기록 ${String(history.length)}번)`,
);
