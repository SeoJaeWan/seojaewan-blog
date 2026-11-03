import { createReadStream, existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

import { loadTable } from './load-table.ts';
import { pageDir } from './paths.ts';
import { type CaseRun, openTraceViewer, runCase } from './run-case.ts';

// @codocs [[테스트 작성 규칙:E2E]]
// 로컬에서 행위 표를 띄운다. 표의 "실행해보기"는 케이스 하나를 Playwright로 돌리고 Trace Viewer로 연다.
const port = Number(process.env.BEHAVIOR_CASES_PORT ?? 4173);
const pageFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const runs = new Map<string, CaseRun>();

/**
 * JSON으로 답한다.
 * @param response HTTP 응답
 * @param status 상태 코드
 * @param body 보낼 값
 */
function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

/**
 * 요청 본문의 `token`을 읽는다.
 * @param request HTTP 요청
 * @returns 케이스 표시(`[행위id#번호]`). 없으면 null
 */
async function readToken(request: IncomingMessage): Promise<string | null> {
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
  }
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null && 'token' in parsed) {
      return typeof parsed.token === 'string' ? parsed.token : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * 요청을 처리한다.
 * @param request HTTP 요청
 * @param response HTTP 응답
 */
async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const page = pageFiles.get(pathname);
  if (request.method === 'GET' && page !== undefined) {
    const [file, type] = page;
    const full = path.join(pageDir, file ?? '');
    if (!existsSync(full)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    createReadStream(full).pipe(response);
    return;
  }
  if (request.method === 'GET' && pathname === '/table.json') {
    const { table } = await loadTable({ mode: 'local' });
    sendJson(response, 200, table);
    return;
  }
  if (request.method === 'GET' && pathname === '/api/runs') {
    sendJson(response, 200, Object.fromEntries(runs));
    return;
  }
  if (request.method === 'POST' && pathname === '/api/run') {
    const token = await readToken(request);
    if (token === null) {
      sendJson(response, 400, { message: '케이스 표시(token)가 없다' });
      return;
    }
    if ([...runs.values()].some((run) => run.status === 'running')) {
      sendJson(response, 409, { message: '다른 케이스를 실행하는 중이다' });
      return;
    }
    runCase(
      token,
      /**
       * 상태를 기억하고, 끝나서 trace가 있으면 Trace Viewer를 연다.
       * @param run 실행 상태
       */
      (run) => {
        runs.set(token, run);
        if (run.status !== 'running' && run.trace !== null) {
          openTraceViewer(run.trace);
        }
      },
    ).catch(
      /**
       * 실행 자체가 실패하면 오류 상태로 남긴다.
       * @param error 던져진 값
       */
      (error: unknown) => {
        runs.set(token, {
          token,
          status: 'error',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
          trace: null,
        });
      },
    );
    sendJson(response, 202, { token });
    return;
  }
  if (request.method === 'POST' && pathname === '/api/open-trace') {
    const token = await readToken(request);
    const trace = token === null ? null : (runs.get(token)?.trace ?? null);
    if (trace === null) {
      sendJson(response, 404, { message: '열 trace가 없다' });
      return;
    }
    openTraceViewer(trace);
    sendJson(response, 200, { token });
    return;
  }
  response.writeHead(404).end();
}

const server = createServer(
  /**
   * 요청을 처리하고, 처리 중 오류는 500으로 답한다.
   * @param request HTTP 요청
   * @param response HTTP 응답
   */
  (request, response) => {
    handle(request, response).catch((error: unknown) => {
      sendJson(response, 500, { message: error instanceof Error ? error.message : String(error) });
    });
  },
);

server.listen(port, '127.0.0.1', () => {
  console.log(`행위 표: http://127.0.0.1:${port}/`);
});
