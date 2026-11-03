// 행위 표 화면. 같은 폴더의 table.json을 읽어 그린다.
// 로컬(`mode: local`)에서는 실행해보기 버튼이, 결과 페이지(`mode: report`)에서는 CI 결과와 trace 링크가 붙는다.

const POLL_MS = 1000;
const TRACE_VIEWER = 'https://trace.playwright.dev/?trace=';
const statusText = {
  passed: '통과',
  flaky: '통과(다시 해서)',
  failed: '실패',
  timedOut: '시간 초과',
  skipped: '건너뜀',
  interrupted: '중단',
  running: '실행 중',
  error: '실행 못 함',
};

const state = { table: null, missingOnly: false, area: null, open: new Set(), runs: {} };

/**
 * 요소를 만든다.
 * @param {string} tag 태그 이름
 * @param {Record<string, string> | null} attrs 속성
 * @param {...(Node | string | null | false)} children 자식
 * @returns {HTMLElement} 만든 요소
 */
function h(tag, attrs, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    element.setAttribute(name, value);
  }
  for (const child of children) {
    if (child !== null && child !== false) {
      element.append(child);
    }
  }
  return element;
}

/**
 * 결과 상태 표시를 만든다.
 * @param {string} status 상태
 * @returns {HTMLElement} 상태 표시
 */
function statusBadge(status) {
  return h('span', { class: `status ${status}` }, statusText[status] ?? status);
}

/**
 * 케이스 줄 오른쪽의 결과·실행 칸을 만든다.
 * @param {object} row 케이스 줄
 * @returns {HTMLElement} 칸
 */
function actionCell(row) {
  const cell = h('td', null);
  const actions = h('div', { class: 'actions' });
  if (state.table.mode === 'local') {
    const run = state.runs[row.grepToken];
    const running = Object.values(state.runs).some((item) => item.status === 'running');
    if (run !== undefined) {
      actions.append(statusBadge(run.status));
      if (run.trace !== null && run.status !== 'running') {
        const reopen = h('button', { class: 'action', type: 'button' }, 'trace 다시 열기');
        reopen.addEventListener('click', () => {
          void fetch('api/open-trace', {
            method: 'POST',
            body: JSON.stringify({ token: row.grepToken }),
          });
        });
        actions.append(reopen);
      }
    }
    const button = h('button', { class: 'action', type: 'button' }, '실행해보기');
    button.disabled = running;
    button.addEventListener('click', () => {
      void startRun(row.grepToken);
    });
    actions.append(button);
    cell.append(actions);
    if (run?.message) {
      cell.append(h('div', { class: 'error-line' }, run.message));
    }
    return cell;
  }
  if (row.result !== null) {
    actions.append(statusBadge(row.result.status));
    if (row.result.trace !== null) {
      const traceUrl = new URL(row.result.trace, location.href).href;
      actions.append(
        h(
          'a',
          {
            class: 'action',
            href: `${TRACE_VIEWER}${encodeURIComponent(traceUrl)}`,
            target: '_blank',
            rel: 'noopener',
          },
          'trace 보기',
        ),
      );
    }
  } else {
    actions.append(h('span', { class: 'muted' }, '결과 없음'));
  }
  cell.append(actions);
  if (row.result?.error) {
    cell.append(h('div', { class: 'error-line' }, row.result.error));
  }
  return cell;
}

/**
 * 근거(목적·문서·코드)를 펼친 줄을 만든다.
 * @param {object} row 케이스 줄
 * @param {number} span 칸 수
 * @returns {HTMLElement} 줄
 */
function evidenceRow(row, span) {
  const grid = h('div', { class: 'evidence-grid' });
  grid.append(
    h(
      'div',
      null,
      h('div', { class: 'evidence-label' }, '목적'),
      row.purpose === '' ? h('span', { class: 'problem' }, '근거 없음') : row.purpose,
    ),
  );
  if (row.problems.length > 0) {
    grid.append(
      h(
        'div',
        null,
        h('div', { class: 'evidence-label' }, '고칠 점'),
        ...row.problems.map((problem) => h('div', { class: 'problem' }, problem)),
      ),
    );
  }
  const docs = h('div', null, h('div', { class: 'evidence-label' }, '문서와 코드'));
  if (row.docs.length === 0) {
    docs.append(h('span', { class: 'problem' }, '근거 없음'));
  }
  for (const doc of row.docs) {
    const code = h('ul', { class: 'code-list' });
    if (doc.code.length === 0) {
      code.append(h('li', { class: 'muted' }, '이 섹션에 연결된 제품 코드가 없다'));
    }
    for (const ref of doc.code) {
      code.append(
        h(
          'li',
          null,
          h('code', null, `${ref.file}:${ref.line}`),
          ' ',
          h('strong', null, ref.name ?? '(선언 못 찾음)'),
          ref.description === '' ? null : ` — ${ref.description}`,
        ),
      );
    }
    docs.append(
      h(
        'div',
        { class: 'doc' },
        h(
          'div',
          { class: doc.found ? 'doc-title' : 'doc-title not-found' },
          `${doc.doc} › ${doc.section}`,
          doc.found ? null : ' (문서에 없음)',
        ),
        doc.firstLine === '' ? null : h('div', { class: 'doc-line' }, doc.firstLine),
        doc.path === null ? null : h('div', { class: 'doc-line' }, h('code', null, doc.path)),
        code,
      ),
    );
  }
  grid.append(docs);
  return h('tr', { class: 'evidence' }, h('td', { colspan: String(span) }, grid));
}

/**
 * 행위 하나의 표를 만든다.
 * @param {object} behavior 행위 표
 * @returns {HTMLElement | null} 행위 카드. 빠진 값만 볼 때 빠진 값이 없으면 null
 */
function behaviorCard(behavior) {
  if (state.missingOnly && behavior.missing.length === 0) {
    return null;
  }
  const span = behavior.conditions.length + 3;
  const head = h(
    'tr',
    null,
    h('th', null, '#'),
    ...behavior.conditions.map((condition) =>
      h('th', null, condition.label, h('span', { class: 'base' }, `기준 ${condition.base}`)),
    ),
    h('th', null, state.table.mode === 'local' ? '실행' : '결과'),
    h('th', null, '근거'),
  );
  const body = h('tbody', null);
  if (!state.missingOnly) {
    for (const row of behavior.cases) {
      const key = `${behavior.id}#${row.number}`;
      const open = state.open.has(key);
      const toggle = h(
        'button',
        { class: 'action', type: 'button', 'aria-expanded': String(open) },
        open ? '접기' : '근거',
      );
      toggle.addEventListener('click', () => {
        if (state.open.has(key)) {
          state.open.delete(key);
        } else {
          state.open.add(key);
        }
        render();
      });
      const number = h('td', { class: 'number' }, String(row.number));
      if (row.changedCount > 1) {
        number.append(
          h('span', { class: 'badge', title: '기준에서 둘 이상 바꿈' }, `×${row.changedCount}`),
        );
      }
      if (row.problems.length > 0) {
        number.append(h('span', { class: 'badge warn', title: row.problems.join('\n') }, '!'));
      }
      body.append(
        h(
          'tr',
          { title: row.purpose },
          number,
          ...row.cells.map((cell) =>
            h('td', { class: cell.changed ? 'cell changed' : 'cell' }, cell.value),
          ),
          actionCell(row),
          h('td', null, toggle),
        ),
      );
      if (open) {
        body.append(evidenceRow(row, span));
      }
    }
  }
  for (const missing of behavior.missing) {
    body.append(
      h(
        'tr',
        { class: 'missing', title: '기준값도 아니고 어떤 케이스도 바꾸지 않은 값' },
        h('td', { class: 'number' }, '–'),
        ...behavior.conditions.map((condition) =>
          condition.key === missing.key
            ? h('td', { class: 'cell missing-value' }, missing.value)
            : h('td', { class: 'cell' }, ''),
        ),
        h('td', null, ''),
        h('td', null, ''),
      ),
    );
  }
  return h(
    'section',
    { class: 'behavior', id: `behavior-${behavior.id}` },
    h(
      'div',
      { class: 'behavior-head' },
      h('h3', null, behavior.name),
      h(
        'div',
        { class: 'behavior-meta' },
        `케이스 ${behavior.cases.length} · 빠진 값 ${behavior.missing.length} · `,
        h('code', null, behavior.file),
      ),
    ),
    h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, head), body)),
  );
}

/** 왼쪽 영역 목록을 그린다. */
function renderAreas() {
  const nav = document.getElementById('areas');
  nav.replaceChildren();
  const all = h(
    'button',
    { class: 'area-button', type: 'button', 'aria-current': String(state.area === null) },
    h('span', { class: 'area-name' }, '전체'),
    h(
      'span',
      { class: 'area-counts' },
      `행위 ${state.table.totals.behaviors} · 케이스 ${state.table.totals.cases} · 빠진 값 ${state.table.totals.missing}`,
    ),
  );
  all.addEventListener('click', () => {
    state.area = null;
    render();
  });
  nav.append(h('div', { class: 'area' }, all));
  for (const area of state.table.areas) {
    const button = h(
      'button',
      { class: 'area-button', type: 'button', 'aria-current': String(state.area === area.area) },
      h('span', { class: 'area-name' }, area.area),
      h(
        'span',
        { class: 'area-counts' },
        `행위 ${area.behaviors} · 케이스 ${area.cases} · `,
        h('span', { class: area.missing > 0 ? 'has-missing' : '' }, `빠진 값 ${area.missing}`),
      ),
    );
    button.addEventListener('click', () => {
      state.area = area.area;
      render();
    });
    const links = h('ul', { class: 'area-links' });
    for (const behavior of state.table.behaviors.filter((item) => item.area === area.area)) {
      links.append(h('li', null, h('a', { href: `#behavior-${behavior.id}` }, behavior.name)));
    }
    nav.append(h('div', { class: 'area' }, button, links));
  }
}

/** 오른쪽 행위 표를 그린다. */
function renderBehaviors() {
  const main = document.getElementById('behaviors');
  main.replaceChildren();
  let shown = 0;
  for (const area of state.table.areas) {
    if (state.area !== null && state.area !== area.area) {
      continue;
    }
    const cards = state.table.behaviors
      .filter((behavior) => behavior.area === area.area)
      .map(behaviorCard)
      .filter((card) => card !== null);
    if (cards.length === 0) {
      continue;
    }
    shown += cards.length;
    main.append(h('h2', { class: 'area-heading' }, area.area), ...cards);
  }
  if (shown === 0) {
    main.append(h('div', { class: 'empty' }, '보일 행위가 없다'));
  }
}

/** 위쪽 요약을 그린다. */
function renderSummary() {
  const { totals, mode, run, generatedAt } = state.table;
  const parts = [`행위 ${totals.behaviors}`, `케이스 ${totals.cases}`, `빠진 값 ${totals.missing}`];
  if (mode === 'report') {
    parts.push(`통과 ${totals.passed}`, `실패 ${totals.failed}`);
  }
  const summary = document.getElementById('summary');
  summary.replaceChildren(parts.join(' · '));
  if (run !== null) {
    summary.append(` · 커밋 ${run.commit.slice(0, 7)}`);
    if (run.url !== null) {
      summary.append(' · ', h('a', { href: run.url }, 'CI 실행'));
    }
  }
  summary.append(` · ${new Date(generatedAt).toLocaleString('ko-KR')}`);
}

/** 화면 전체를 다시 그린다. */
function render() {
  renderSummary();
  renderAreas();
  renderBehaviors();
}

/**
 * 실행 상태를 받아 온다. 실행 중이면 끝날 때까지 다시 묻는다.
 */
async function pollRuns() {
  const response = await fetch('api/runs');
  state.runs = await response.json();
  render();
  if (Object.values(state.runs).some((run) => run.status === 'running')) {
    setTimeout(() => {
      void pollRuns();
    }, POLL_MS);
  }
}

/**
 * 케이스 하나를 서버에서 실행한다. 끝나면 서버가 Trace Viewer를 연다.
 * @param {string} token 케이스 표시
 */
async function startRun(token) {
  const response = await fetch('api/run', { method: 'POST', body: JSON.stringify({ token }) });
  if (!response.ok) {
    const { message } = await response.json();
    alert(message);
    return;
  }
  await pollRuns();
}

document.getElementById('missing-only').addEventListener('change', (event) => {
  state.missingOnly = event.target.checked;
  render();
});

const response = await fetch('table.json', { cache: 'no-store' });
state.table = await response.json();
render();
if (state.table.mode === 'local') {
  await pollRuns();
}
