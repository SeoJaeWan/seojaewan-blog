import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { fromRepo, runsDir, WEB_DIR } from './paths.ts';
import { type JsonReport, readReportedCases, type ReportedCase } from './playwright-results.ts';

/**
 * 실행해보기 한 번의 상태.
 * - message: 실패·오류 내용
 * - steps: 기대 결과 단계(`test.step`)와 실패 여부
 * - trace: trace zip 절대 경로
 */
export type CaseRun = {
  token: string;
  status: 'running' | 'passed' | 'failed' | 'error';
  startedAt: string;
  finishedAt: string | null;
  message: string | null;
  steps: ReportedCase['steps'];
  trace: string | null;
};

/** 실행해보기에서 동작 사이를 늦추는 시간(ms) */
const SLOW_MO_MS = 300;
/** 실행해보기에서 동작 표시를 보이는 시간(ms). Playwright 기본값이다 */
const ACTION_ANNOTATION_MS = 500;

const playwrightCli = createRequire(fromRepo(`${WEB_DIR}/package.json`)).resolve(
  '@playwright/test/cli',
);

/**
 * 문자열을 정규식에서 글자 그대로 찾게 한다.
 * @param text 찾을 글자
 * @returns 정규식 원문
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Playwright 명령을 돌린다.
 * @param args 명령 인자
 * @param env 더할 환경 변수
 * @returns 끝난 코드와 출력
 */
async function runPlaywright(
  args: string[],
  env: Record<string, string>,
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, ...args], {
      cwd: fromRepo(WEB_DIR),
      env: { ...process.env, ...env },
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, output });
    });
  });
}

/**
 * 케이스 하나를 Playwright로 돌린다. 사람이 따라 볼 수 있게 `slowMo`를 켜고 trace를 남긴다.
 * 앱 서버는 Playwright 설정의 `webServer`가 띄우고, 이미 떠 있으면 그것을 쓴다.
 * @codocs [[테스트 작성 규칙:E2E]]
 * @param token 고를 케이스(`[행위id#번호]`)
 * @param onChange 상태가 바뀔 때 부른다
 */
export async function runCase(token: string, onChange: (run: CaseRun) => void): Promise<void> {
  const run: CaseRun = {
    token,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    message: null,
    trace: null,
    steps: [],
  };
  onChange({ ...run });

  /**
   * 끝난 상태를 알린다.
   * @param status 끝난 상태
   * @param message 실패·오류 내용
   * @param trace trace zip 경로
   * @param steps 기대 결과 단계
   */
  function finish(
    status: CaseRun['status'],
    message: string | null,
    trace: string | null,
    steps: CaseRun['steps'] = [],
  ): void {
    onChange({ ...run, status, message, trace, steps, finishedAt: new Date().toISOString() });
  }

  if (!existsSync(fromRepo(`${WEB_DIR}/.next/BUILD_ID`))) {
    finish(
      'error',
      '앱 빌드가 없다. 먼저 `CONTENT_SOURCE=fixture pnpm build`(Windows는 `next build --webpack`)로 빌드한다.',
      null,
    );
    return;
  }

  const dir = path.join(runsDir, token.replace(/[^\w-]/gu, '_'));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const reportPath = path.join(dir, 'report.json');
  const { code, output } = await runPlaywright(
    [
      'test',
      '--grep',
      escapeRegExp(token),
      '--trace',
      'on',
      '--retries',
      '0',
      '--workers',
      '1',
      '--reporter',
      'json',
      '--output',
      path.join(dir, 'results'),
    ],
    {
      // E2E는 fixture를 읽는다([[콘텐츠 원천:읽는 곳]]). 앱 빌드도 fixture로 만들어 둔다.
      CONTENT_SOURCE: 'fixture',
      SCENARIO_CASES_SLOW_MO: String(SLOW_MO_MS),
      SCENARIO_CASES_ACTION_MS: String(ACTION_ANNOTATION_MS),
      PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
    },
  );

  if (!existsSync(reportPath)) {
    finish(
      'error',
      output.trim().split('\n').at(-1) ?? `Playwright가 ${String(code)}로 끝났다`,
      null,
    );
    return;
  }
  // Playwright가 쓴 보고서다.
  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as JsonReport;
  const result = readReportedCases(report).get(token);
  if (result === undefined) {
    finish('error', '그 케이스를 찾지 못했다', null);
    return;
  }
  finish(
    result.status === 'passed' ? 'passed' : 'failed',
    result.error,
    result.tracePath,
    result.steps,
  );
}

/**
 * Trace Viewer를 연다. 화면을 띄운 채 서버와 따로 돈다.
 * @param trace trace zip 절대 경로
 */
export function openTraceViewer(trace: string): void {
  const child = spawn(process.execPath, [playwrightCli, 'show-trace', trace], {
    cwd: fromRepo(WEB_DIR),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}
