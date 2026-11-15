// 시나리오 케이스 화면. 같은 폴더의 table.json을 읽어 그린다. 로컬 도구와 CI 보고서가 같은 코드를 쓴다.
// 로컬(`mode: local`)의 실행해보기는 그 자리에서 케이스를 돌리고 Trace Viewer를 열고,
// 보고서(`mode: report`)의 실행해보기는 그 케이스의 CI trace를 같은 사이트의 Trace Viewer(`report.traceViewer`)로 연다.
// `main` 보고서는 함께 복사한 `trace/`를, PR 실패 보고서(`/failures/pr-<번호>/`)는 사이트 루트의 `trace/`를 쓴다.

const POLL_MS = 1000;
const DEFAULT_TRACE_VIEWER = 'trace/';
const REPORT_URL = 'https://scenario-cases.seojaewan.com/';
const CHEVRON =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';

const state = {
  table: null,
  query: '',
  onlyFailed: false,
  onlyMissing: false,
  open: new Set(),
  runs: {},
};

/**
 * HTML에 넣을 글자를 이스케이프한다.
 * @param {unknown} value 글자
 * @returns {string} 이스케이프한 글자
 */
function esc(value) {
  return String(value).replace(
    /[&<>"']/gu,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

/**
 * 저장소 파일의 GitHub 주소를 만든다.
 * @param {string} file 저장소 기준 경로
 * @param {number | null} [line] 줄
 * @returns {string} 주소
 */
function githubUrl(file, line = null) {
  return `${state.table.repoUrl}/blob/main/${file}${line === null ? '' : `#L${line}`}`;
}

/**
 * 케이스의 실패 정보를 꺼낸다. 보고서는 CI 결과, 로컬은 실행해보기 결과를 본다.
 * @param {object} info 케이스
 * @returns {{ check: string | null, error: string } | null} 실패면 실패한 기대 결과와 오류, 아니면 null
 */
function failureOf(info) {
  if (state.table.mode === 'report') {
    const outcome = info.outcome;
    if (outcome === null || ['passed', 'flaky', 'skipped'].includes(outcome.status)) {
      return null;
    }
    const failed = outcome.checks.find((check) => check.status === 'failed');
    return { check: failed?.name ?? null, error: outcome.error ?? outcome.status };
  }
  const run = state.runs[info.grepToken];
  if (run === undefined || (run.status !== 'failed' && run.status !== 'error')) {
    return null;
  }
  const failed = run.steps.find((item) => item.isFailed);
  return { check: failed?.title ?? null, error: run.message ?? '실행하지 못했다' };
}

/**
 * 기대 결과 하나의 확인 상태를 정한다.
 * @param {object} info 케이스
 * @param {string} expected 기대 결과
 * @returns {'ok' | 'bad' | 'todo'} 확인함, 실패, 아직 모름
 */
function checkState(info, expected) {
  if (state.table.mode === 'report') {
    const check = info.outcome?.checks.find((item) => item.name === expected);
    return check?.status === 'passed' ? 'ok' : check?.status === 'failed' ? 'bad' : 'todo';
  }
  const run = state.runs[info.grepToken];
  const steps = run?.steps.filter((item) => item.title === expected) ?? [];
  if (steps.length === 0) {
    return 'todo';
  }
  return steps.some((item) => item.isFailed) ? 'bad' : 'ok';
}

/**
 * 행위에 실패한 케이스가 있는지 본다.
 * @param {object} behavior 행위 표
 * @returns {boolean} 실패가 있으면 true
 */
function behaviorFailed(behavior) {
  return behavior.cases.some((info) => failureOf(info) !== null);
}

/**
 * 요약 카드 네 개를 그린다.
 */
function renderStats() {
  const { totals, run, mode, areas } = state.table;
  const coverage = totals.values === 0 ? 0 : Math.round((totals.covered / totals.values) * 100);
  let passed = totals.passed;
  let failed = totals.failed;
  if (mode === 'local') {
    const runs = Object.values(state.runs).filter((item) => item.status !== 'running');
    passed = runs.filter((item) => item.status === 'passed').length;
    failed = runs.length - passed;
  }
  const ran = passed + failed;
  const rate =
    mode === 'report'
      ? `${totals.cases === 0 ? 0 : Math.round((passed / totals.cases) * 100)}%`
      : ran === 0
        ? '–'
        : `${Math.round((passed / ran) * 100)}%`;
  const rateNote =
    mode === 'report' || ran > 0
      ? `통과 ${passed} · 실패 ${failed}`
      : '로컬은 실행해보기 결과만 센다';
  let last = `<div class="k">마지막 실행</div><div class="v when">로컬</div><div class="s"><a href="${REPORT_URL}" target="_blank" rel="noopener">CI 결과 보고서</a></div>`;
  if (run !== null) {
    const when = new Intl.DateTimeFormat('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul',
    }).format(new Date(run.time));
    const seconds = Math.round(run.durationMs / 1000);
    const duration =
      seconds >= 60 ? `${Math.floor(seconds / 60)}분 ${seconds % 60}초` : `${seconds}초`;
    const link = run.url
      ? ` · <a href="${esc(run.url)}" target="_blank" rel="noopener">실행 기록</a>`
      : '';
    last = `<div class="k">마지막 실행</div><div class="v when">${esc(when)}</div><div class="s"><span class="mono">${esc(run.commit.slice(0, 7))}</span> · ${duration}${link}</div>`;
  }
  document.getElementById('stats').innerHTML = `
    <div class="stat"><div class="k">케이스</div><div class="v">${totals.cases}</div><div class="s">행위 ${totals.behaviors} · 영역 ${areas.length}</div></div>
    <div class="stat"><div class="k">통과율</div><div class="v">${rate}</div><div class="s">${rateNote}</div></div>
    <div class="stat"><div class="k">값 커버리지</div><div class="v">${coverage}%<small>${totals.covered}/${totals.values}</small></div><div class="s">이유 있음 ${totals.reason} · 빠짐 ${totals.missing}</div></div>
    <div class="stat">${last}</div>`;
}

/**
 * 줄이 찾기·거르기에 맞는지 본다.
 * @param {object} behavior 행위 표
 * @param {object} row 줄
 * @returns {boolean} 보이면 true
 */
function rowVisible(behavior, row) {
  const info = row.kind === 'case' ? behavior.cases[row.case - 1] : null;
  if (state.onlyFailed && (info === null || failureOf(info) === null)) {
    return false;
  }
  if (state.onlyMissing && row.kind !== 'missing') {
    return false;
  }
  if (state.query === '') {
    return true;
  }
  const text = [
    behavior.name,
    behavior.summary,
    row.result,
    ...row.cells.map((cell) => cell.value),
    info?.scenario ?? '',
    ...(info?.expected ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return text.includes(state.query);
}

/**
 * 실패 메시지를 한 줄로 줄인다. 기대값과 실제값이 있으면 함께 붙인다.
 * @param {string} error 실패 메시지
 * @returns {string} 한 줄
 */
function errorLine(error) {
  const first = error.split('\n')[0] ?? '';
  const expected = /^Expected[^:]*: (.*)$/mu.exec(error)?.[1];
  const received = /^Received[^:]*: (.*)$/mu.exec(error)?.[1];
  return expected !== undefined && received !== undefined
    ? `${first} — 기대 ${expected}, 실제 ${received}`
    : first;
}

/**
 * 근거 펼침을 그린다. 실패면 맨 위에 실패한 기대 결과와 오류 한 줄을 둔다.
 * @param {object} info 케이스
 * @param {number} span 줄이 차지하는 칸 수
 * @returns {string} 근거 줄 HTML
 */
function evidence(info, span) {
  const failure = failureOf(info);
  const failBox =
    failure === null
      ? ''
      : `<div class="fail-box"><div class="bad">${esc(failure.check ?? '기대 결과 확인 전에 실패했다')}</div><div class="error mono">${esc(errorLine(failure.error))}</div></div>`;
  const expected = info.expected
    .map((item) => `<li class="${checkState(info, item)}">${esc(item)}</li>`)
    .join('');
  const combine =
    info.combineReason === null ? '' : `<p class="note">엮은 이유: ${esc(info.combineReason)}</p>`;
  const seen = new Set();
  const code = [];
  for (const doc of info.docs) {
    for (const ref of state.table.sections[doc.link]?.code ?? []) {
      const key = `${ref.file}:${ref.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        code.push(ref);
      }
    }
  }
  /**
   * 코드 근거 한 곳의 목록 항목을 만든다.
   * @param {object} ref 코드 근거
   * @returns {string} HTML
   */
  function codeItem(ref) {
    const name = ref.name ?? ref.file.split('/').pop();
    return `<li><a class="mono" href="${esc(githubUrl(ref.file, ref.line))}" target="_blank" rel="noopener">${esc(name)}</a><span class="mono loc" title="${esc(`${ref.file}:${ref.line}`)}">${esc(ref.file.split('/').pop())}:${ref.line}</span></li>`;
  }
  const codeHtml =
    code.length === 0
      ? '<span class="dash">연결된 코드 없음</span>'
      : `<ul class="code">${code.slice(0, 3).map(codeItem).join('')}</ul>${
          code.length > 3
            ? `<details><summary>나머지 ${code.length - 3}곳 ▸</summary><ul class="code">${code.slice(3).map(codeItem).join('')}</ul></details>`
            : ''
        }`;
  const docs = info.docs
    .map((doc) => {
      const path = state.table.sections[doc.link]?.path;
      const label = `${esc(doc.doc)} › ${esc(doc.section)}`;
      return `<li>${path ? `<a href="${esc(githubUrl(path))}" target="_blank" rel="noopener">${label}</a>` : label}</li>`;
    })
    .join('');
  return `<tr class="evidence"><td colspan="${span}"><div class="evidence-box">${failBox}
    <div><h4>목적</h4><p class="scenario">${esc(info.scenario)}</p><ul>${expected}</ul>${combine}</div>
    <div><h4>코드</h4>${codeHtml}</div>
    <div><h4>문서</h4><ul>${docs}</ul></div></div></td></tr>`;
}

/**
 * 케이스 줄의 실행해보기 칸을 그린다.
 * @param {object} info 케이스
 * @returns {string} HTML
 */
function runCell(info) {
  if (state.table.mode === 'report') {
    if (!info.outcome?.trace) {
      return '<span class="dash">–</span>';
    }
    const trace = new URL(info.outcome.trace, location.href).href;
    const viewer = state.table.report?.traceViewer ?? DEFAULT_TRACE_VIEWER;
    return `<a class="run-button" href="${esc(`${viewer}?trace=${encodeURIComponent(trace)}`)}" target="_blank" rel="noopener">실행해보기</a>`;
  }
  const running = state.runs[info.grepToken]?.status === 'running';
  return `<button type="button" class="run-button" data-run="${esc(info.grepToken)}"${running ? ' disabled' : ''}>${running ? '실행 중…' : '실행해보기'}</button>`;
}

/**
 * 행위 카드 하나를 그린다. 맞는 줄이 없으면 빈 글자다.
 * @param {object} behavior 행위 표
 * @param {number} number 행위 번호
 * @returns {string} HTML
 */
function card(behavior, number) {
  const span = behavior.conditions.length + 4;
  const body = [];
  for (const group of behavior.groups) {
    const rows = group.rows.filter((row) => rowVisible(behavior, row));
    if (rows.length === 0) {
      continue;
    }
    const title = group.key === null ? group.label : `${group.label} (${group.rows.length})`;
    body.push(`<tr class="group"><td colspan="${span}">${esc(title)}</td></tr>`);
    for (const row of rows) {
      const info = row.kind === 'case' ? behavior.cases[row.case - 1] : null;
      const failure = info === null ? null : failureOf(info);
      const kind = row.kind === 'missing' ? 'missing' : row.kind === 'case' ? '' : 'gray';
      const cells = row.cells
        .map((cell) => `<td class="v${cell.isChanged ? ' ch' : ''}">${esc(cell.value)}</td>`)
        .join('');
      const key = info === null ? '' : `${behavior.id}:${info.number}`;
      const open = info !== null && state.open.has(key);
      const result = esc(row.result) + (failure === null ? '' : '<span class="tag">실패</span>');
      const run = info === null ? '<span class="dash">–</span>' : runCell(info);
      const button =
        info === null
          ? ''
          : `<button type="button" class="evidence-button" aria-expanded="${open}" aria-label="근거 펼치기" data-open="${esc(key)}">${CHEVRON}</button>`;
      body.push(
        `<tr class="${kind}${failure === null ? '' : ' failed'}"><td class="n">${info?.number ?? ''}</td>${cells}<td class="res">${result}</td><td class="run">${run}</td><td class="ev">${button}</td></tr>`,
      );
      if (open) {
        body.push(evidence(info, span));
      }
    }
  }
  if (body.length === 0) {
    return '';
  }
  const cols = `<colgroup><col style="width:60px">${behavior.conditions.map(() => '<col>').join('')}<col style="width:22%"><col style="width:108px"><col style="width:52px"></colgroup>`;
  const head = `<tr><th>번호</th>${behavior.conditions.map((condition) => `<th>${esc(condition.label)}</th>`).join('')}<th>결과</th><th class="run">실행</th><th class="ev">근거</th></tr>`;
  return `<article class="card" id="b-${esc(behavior.id)}"><h2>${number}. ${esc(behavior.name)} <span class="arrow">→ ${esc(behavior.summary)}</span></h2><table>${cols}<thead>${head}</thead><tbody>${body.join('')}</tbody></table></article>`;
}

/**
 * 왼쪽 행위 목록과 행위 카드를 그린다.
 */
function renderList() {
  const nav = [];
  const list = [];
  let number = 0;
  for (const area of state.table.areas) {
    const behaviors = state.table.behaviors.filter((behavior) => behavior.area === area);
    nav.push(`<div class="area">${esc(area)}</div>`);
    const cards = [];
    for (const behavior of behaviors) {
      number += 1;
      nav.push(
        `<a href="#b-${esc(behavior.id)}"${behaviorFailed(behavior) ? ' class="fail"' : ''}>${esc(behavior.name)}</a>`,
      );
      cards.push(card(behavior, number));
    }
    const joined = cards.join('');
    if (joined !== '') {
      list.push(`<div class="area-title">${esc(area)}</div>${joined}`);
    }
  }
  document.getElementById('nav').innerHTML = nav.join('');
  document.getElementById('list').innerHTML =
    list.join('') || '<div class="empty">맞는 줄이 없다.</div>';
}

/**
 * 화면 전체를 다시 그린다.
 */
function render() {
  renderStats();
  renderList();
}

/**
 * 실행해보기 상태를 읽는다. 실행 중인 케이스가 있으면 다시 읽는다.
 */
async function refreshRuns() {
  const response = await fetch('api/runs', { cache: 'no-store' });
  state.runs = await response.json();
  render();
  if (Object.values(state.runs).some((run) => run.status === 'running')) {
    setTimeout(() => void refreshRuns(), POLL_MS);
  }
}

/**
 * 케이스 하나를 그 자리에서 돌린다. 끝나면 서버가 Trace Viewer를 연다.
 * @param {string} token 케이스 표시
 */
async function startRun(token) {
  const response = await fetch('api/run', { method: 'POST', body: JSON.stringify({ token }) });
  if (!response.ok) {
    const { message } = await response.json();
    alert(message);
    return;
  }
  await refreshRuns();
}

/**
 * 거르기 단추 하나를 켜고 끈다.
 * @param {string} id 단추 id
 * @param {'onlyFailed' | 'onlyMissing'} key 상태 이름
 */
function bindToggle(id, key) {
  const button = document.getElementById(id);
  button.addEventListener('click', () => {
    state[key] = !state[key];
    button.setAttribute('aria-pressed', String(state[key]));
    renderList();
  });
}

/**
 * 보고서 설정을 화면에 반영한다. PR 실패 보고서는 제목에 PR 번호와 `main` 보고서 링크를 보이고,
 * 실패한 케이스만 담은 보고서는 "실패만" 거르기를 켜고 연다.
 */
function applyReportOptions() {
  const report = state.table.report;
  if (report === null || report === undefined) {
    return;
  }
  if (report.pr !== null) {
    const pr = `PR #${report.pr}`;
    document.title = `시나리오 케이스 · ${pr} 실패`;
    document.querySelector('.top h1').innerHTML =
      `시나리오 케이스 · <a href="${esc(`${state.table.repoUrl}/pull/${report.pr}`)}" target="_blank" rel="noopener">${esc(pr)}</a> 실패 <small><a href="${REPORT_URL}">main 보고서</a></small>`;
  }
  if (report.isFailedOnly) {
    state.onlyFailed = true;
    document.getElementById('only-failed').setAttribute('aria-pressed', 'true');
  }
}

/**
 * 화면 데이터를 읽어 처음 그린다.
 */
async function start() {
  const response = await fetch('table.json', { cache: 'no-store' });
  state.table = await response.json();
  applyReportOptions();
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const run = target?.closest('[data-run]');
    if (run) {
      void startRun(run.getAttribute('data-run'));
      return;
    }
    const toggle = target?.closest('[data-open]');
    if (toggle) {
      const key = toggle.getAttribute('data-open');
      if (state.open.has(key)) {
        state.open.delete(key);
      } else {
        state.open.add(key);
      }
      renderList();
    }
  });
  document.getElementById('query').addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderList();
  });
  bindToggle('only-failed', 'onlyFailed');
  bindToggle('only-missing', 'onlyMissing');
  render();
  if (state.table.mode === 'local') {
    await refreshRuns();
  }
}

void start();
