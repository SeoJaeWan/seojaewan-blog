import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

import { type HistoryRun, runSummaryOf } from './build-table.ts';
import { mergeHistory } from './history.ts';
import { loadTable } from './load-table.ts';
import { defaultReportDir, pageDir } from './paths.ts';
import { checksOf, type JsonReport, readReportedCases } from './playwright-results.ts';
import { readBehaviors } from './read-behaviors.ts';
import type { CaseResult, FilmFrame, ResultStatus } from './table-types.ts';
import { pickFrames, readTraceTimeline } from './trace-film.ts';
import { readZip } from './zip.ts';

// @codocs [[테스트 작성 규칙:E2E]]
// CI가 모든 케이스를 돌린 Playwright JSON 보고서와 trace를 화면 데이터에 붙여 정적 보고서를 만든다.
// trace zip은 보고서와 함께 올려 trace.playwright.dev 뷰어가 그 주소로 열고, trace의 화면 몇 장을 줄여 필름 띠로 넣는다.
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

/** 필름 띠의 장 수 */
const FILM_FRAMES = 4;
/** 필름 띠 한 장의 최대 크기(px) */
const FILM_MAX_WIDTH = 320;
const FILM_MAX_HEIGHT = 200;
/** 필름 띠 JPEG 품질 */
const FILM_QUALITY = 0.7;

if (values.results === undefined || !existsSync(values.results)) {
  throw new Error('--results에 Playwright JSON 보고서 경로를 준다');
}

const outDir = path.resolve(values.out);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(path.join(outDir, 'traces'), { recursive: true });
mkdirSync(path.join(outDir, 'film'), { recursive: true });

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

const browser = await chromium.launch();
const page = await browser.newPage();

/**
 * 프레임 이미지를 필름 띠 크기로 줄인다. 브라우저 캔버스로 줄여 이미지 라이브러리를 따로 두지 않는다.
 * @param image 원래 이미지
 * @param type 이미지 종류
 * @returns 줄인 JPEG
 */
async function shrink(image: Buffer, type: string): Promise<Buffer> {
  const base64 = await page.evaluate(
    /**
     * 브라우저 안에서 이미지를 캔버스로 줄여 JPEG base64로 돌려준다.
     * @param options 이미지(base64)와 종류, 최대 크기, 품질
     * @returns 줄인 JPEG의 base64
     */
    async (options) => {
      const { data, mime, maxWidth, maxHeight, quality } = options;
      const blob = await (await fetch(`data:${mime};base64,${data}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
      const canvas = new OffscreenCanvas(
        Math.round(bitmap.width * scale),
        Math.round(bitmap.height * scale),
      );
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const out = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      const bytes = new Uint8Array(await out.arrayBuffer());
      let binary = '';
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary);
    },
    {
      data: image.toString('base64'),
      mime: type,
      maxWidth: FILM_MAX_WIDTH,
      maxHeight: FILM_MAX_HEIGHT,
      quality: FILM_QUALITY,
    },
  );
  return Buffer.from(base64, 'base64');
}

/**
 * trace에서 필름 띠를 뽑아 보고서 폴더에 쓴다.
 * @param tracePath trace zip 경로
 * @param name 파일 이름 앞부분
 * @returns 필름 띠. 읽지 못하면 빈 배열
 */
async function writeFilm(tracePath: string, name: string): Promise<FilmFrame[]> {
  try {
    const zip = readFileSync(tracePath);
    const traces = readZip(zip, (entry) => entry.endsWith('.trace'));
    const timeline = readTraceTimeline([...traces.values()].map((data) => data.toString('utf8')));
    const picked = pickFrames(timeline, FILM_FRAMES);
    const images = readZip(zip, (entry) => picked.some((frame) => frame.file === entry));
    const film: FilmFrame[] = [];
    for (const [index, frame] of picked.entries()) {
      const image = images.get(frame.file);
      if (image === undefined) {
        continue;
      }
      const src = `film/${name}-${String(index)}.jpg`;
      const type = frame.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
      writeFileSync(path.join(outDir, src), await shrink(image, type));
      film.push({ src, atMs: Math.max(0, frame.timestamp - timeline.start), failed: frame.failed });
    }
    return film;
  } catch (error) {
    console.warn(`필름 띠를 만들지 못했다(${name}): ${String(error)}`);
    return [];
  }
}

const results = new Map<string, CaseResult>();
const currentResults: Record<string, ResultStatus> = {};
for (const [token, reported] of readReportedCases(report)) {
  const name = token.replace(/[^\w-]/gu, '_');
  let trace: string | null = null;
  let film: FilmFrame[] = [];
  if (reported.tracePath !== null && existsSync(reported.tracePath)) {
    trace = `traces/${name}.zip`;
    copyFileSync(reported.tracePath, path.join(outDir, trace));
    film = await writeFilm(reported.tracePath, name);
  }
  const known = caseByToken.get(token);
  results.set(token, {
    status: reported.status,
    durationMs: reported.durationMs,
    error: reported.error,
    trace,
    checks: checksOf(known?.expected ?? [], reported.steps),
    film,
  });
  if (known !== undefined) {
    currentResults[known.key] = reported.status;
  }
}
await browser.close();

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

const { table } = await loadTable({ mode: 'report', results, run, history });
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
