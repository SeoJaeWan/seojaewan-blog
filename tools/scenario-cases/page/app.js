// 시나리오 케이스 화면. 같은 폴더의 table.json을 읽어 그린다. 로컬 도구와 GitHub Pages 보고서가 같은 코드를 쓴다.
// 로컬(`mode: local`)에서는 실행해보기와 이번 PR 거르기가, 보고서(`mode: report`)에서는 CI 결과·필름 띠·trace 링크가 붙는다.

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
const checkMark = { passed: '✓', failed: '✕', unchecked: '–' };
const checkText = { passed: '확인', failed: '실패', unchecked: '확인 못 함' };

const state = {
  table: null,
  query: '',
  result: 'all',
  missingOnly: false,
  prOnly: false,
  common: null,
  area: null,
  open: new Set(),
  openCell: null,
  runs: {},
  panel: null,
};

/**
 * 요소를 만든다.
 * @param {string} tag 태그 이름
 * @param {Record<string, string> | null} attrs 속성
 * @param {...(Node | string | null | false | undefined)} children 자식
 * @returns {HTMLElement} 만든 요소
 */
function h(tag, attrs, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value !== null && value !== undefined && value !== false) {
      element.setAttribute(name, value === true ? '' : value);
    }
  }
  for (const child of children) {
    if (child !== null && child !== false && child !== undefined) {
      element.append(child);
    }
  }
  return element;
}

/**
 * 누를 수 있는 글자 버튼을 만든다.
 * @param {string} label 글자
 * @param {() => void} onClick 눌렀을 때
 * @param {string} [className] 클래스
 * @returns {HTMLButtonElement} 버튼
 */
function button(label, onClick, className = 'link') {
  const element = h('button', { type: 'button', class: className }, label);
  element.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return element;
}

/**
 * 시각을 읽기 좋게 쓴다.
 * @param {string} iso ISO 시각
 * @returns {string} 예: 11월 3일 11:12
 */
function formatTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 걸린 시간을 초로 쓴다.
 * @param {number} ms 밀리초
 * @returns {string} 예: 2.5초
 */
function formatDuration(ms) {
  return ms >= 60_000 ? `${(ms / 60_000).toFixed(1)}분` : `${(ms / 1000).toFixed(1)}초`;
}

/**
 * 결과가 통과인지 본다.
 * @param {string | undefined} status 상태
 * @returns {boolean} 통과면 true
 */
function isPass(status) {
  return status === 'passed' || status === 'flaky';
}

/**
 * 케이스의 지금 상태를 고른다. 로컬은 실행해보기 결과, 보고서는 CI 결과다.
 * @param {object} row 케이스 줄
 * @returns {string | null} 상태. 결과가 없으면 null
 */
function caseStatus(row) {
  if (state.table.mode === 'local') {
    return state.runs[row.grepToken]?.status ?? null;
  }
  return row.result?.status ?? null;
}

/**
 * 상태가 실패 쪽인지 본다.
 * @param {string | null} status 상태
 * @returns {boolean} 실패면 true
 */
function isFail(status) {
  return status !== null && !isPass(status) && status !== 'skipped' && status !== 'running';
}

/**
 * 조건 이름과 값으로 칸 열쇠를 만든다.
 * @param {string} behaviorId 행위 id
 * @param {string} key 조건 키
 * @param {string} value 값
 * @returns {string} 열쇠
 */
function cellKey(behaviorId, key, value) {
  return `${behaviorId}\u0000${key}\u0000${value}`;
}

/**
 * 케이스가 지금 거르기에 맞는지 본다.
 * @param {object} behavior 행위
 * @param {object} row 케이스 줄
 * @returns {boolean} 보이면 true
 */
function caseVisible(behavior, row) {
  const status = caseStatus(row);
  if (state.result === 'failed' && !isFail(status)) {
    return false;
  }
  if (state.result === 'passed' && !isPass(status)) {
    return false;
  }
  if (state.prOnly && !row.affected) {
    return false;
  }
  if (state.query === '') {
    return true;
  }
  const text = [
    behavior.name,
    row.scenario,
    ...row.expected,
    ...row.cells.map((cell) => cell.value),
    row.grepToken,
  ]
    .join(' ')
    .toLowerCase();
  return text.includes(state.query);
}

/**
 * 행위가 지금 거르기에 맞는지 본다.
 * @param {object} behavior 행위
 * @returns {boolean} 보이면 true
 */
function behaviorVisible(behavior) {
  if (state.area !== null && behavior.area !== state.area) {
    return false;
  }
  if (state.common !== null && !state.common.behaviors.includes(behavior.id)) {
    return false;
  }
  if (state.missingOnly) {
    return behavior.counts.missing > 0 && (state.query === '' || matchesBehavior(behavior));
  }
  return behavior.cases.some((row) => caseVisible(behavior, row));
}

/**
 * 검색어가 행위 이름이나 조건 값에 맞는지 본다.
 * @param {object} behavior 행위
 * @returns {boolean} 맞으면 true
 */
function matchesBehavior(behavior) {
  const text = [
    behavior.name,
    ...behavior.conditions.flatMap((condition) => [
      condition.label,
      ...condition.values.map((cell) => cell.value),
    ]),
  ]
    .join(' ')
    .toLowerCase();
  return text.includes(state.query);
}

/**
 * 상태 점을 만든다. 색은 상태에만 쓴다.
 * @param {string | null} status 상태
 * @returns {HTMLElement} 점
 */
function statusDot(status) {
  let kind = 'none';
  if (isPass(status)) {
    kind = 'pass';
  } else if (status === 'running') {
    kind = 'running';
  } else if (isFail(status)) {
    kind = 'fail';
  }
  return h('span', {
    class: `dot ${kind}`,
    title: status === null ? '결과 없음' : (statusText[status] ?? status),
  });
}

/**
 * 머리 줄의 실행 정보를 그린다.
 */
function renderMeta() {
  const { table } = state;
  const meta = document.getElementById('run-meta');
  meta.replaceChildren();
  if (table.mode === 'local') {
    meta.append(
      '로컬 · 행위 정의에서 바로 만든 화면 · ',
      h('span', { class: 'mono' }, formatTime(table.generatedAt)),
    );
    return;
  }
  if (table.run !== null) {
    meta.append(
      'CI 보고서 · ',
      h('span', { class: 'mono' }, `main ${table.run.commit.slice(0, 7)}`),
      ` · ${formatTime(table.run.time)} 실행`,
    );
    if (table.run.url !== null) {
      meta.append(
        ' · ',
        h('a', { href: table.run.url, target: '_blank', rel: 'noopener' }, '실행 기록'),
      );
    }
  }
}

/**
 * 위 요약(케이스 수, 통과율, 값 커버리지, 마지막 실행)을 그린다.
 */
function renderSummary() {
  const { table } = state;
  const { totals } = table;
  const summary = document.getElementById('summary');
  const ran = totals.passed + totals.failed;
  const rate = ran === 0 ? null : Math.round((totals.passed / ran) * 1000) / 10;
  const coverage = totals.values === 0 ? 0 : Math.round((totals.covered / totals.values) * 100);
  const bar = h(
    'div',
    {
      class: 'bar',
      role: 'img',
      'aria-label': `케이스 ${totals.covered}, 이유 ${totals.reason}, 빠짐 ${totals.missing}`,
    },
    h('span', { class: 'seg case', style: `flex-grow:${totals.covered}` }),
    h('span', { class: 'seg reason', style: `flex-grow:${totals.reason}` }),
    h('span', { class: 'seg missing', style: `flex-grow:${totals.missing}` }),
  );
  const lastRun = h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, '마지막 실행'));
  if (table.run === null) {
    lastRun.append(
      h('div', { class: 'stat-value small' }, '—'),
      h('div', { class: 'stat-note' }, '로컬은 실행해보기로 케이스 하나씩 돌린다'),
    );
  } else {
    lastRun.append(
      h('div', { class: 'stat-value small' }, formatTime(table.run.time)),
      h(
        'div',
        { class: 'stat-note' },
        h('span', { class: 'mono' }, table.run.commit.slice(0, 7)),
        ` · 합계 ${formatDuration(table.run.durationMs)}`,
      ),
    );
    if (table.runs.length > 1) {
      const trail = h('div', { class: 'stat-note runs' }, `최근 ${table.runs.length}번 `);
      for (const run of [...table.runs].reverse()) {
        trail.append(
          h('span', {
            class: `tick ${run.failed > 0 ? 'fail' : 'pass'}`,
            title: `${formatTime(run.time)} · ${run.commit.slice(0, 7)} · 실패 ${run.failed}`,
          }),
        );
      }
      lastRun.append(trail);
    }
  }
  summary.replaceChildren(
    h(
      'div',
      { class: 'stat' },
      h('div', { class: 'stat-label' }, '케이스'),
      h('div', { class: 'stat-value' }, String(totals.cases)),
      h('div', { class: 'stat-note' }, `행위 ${totals.behaviors} · 영역 ${table.areas.length}`),
    ),
    h(
      'div',
      { class: 'stat' },
      h('div', { class: 'stat-label' }, '통과율'),
      h(
        'div',
        { class: `stat-value${totals.failed > 0 ? ' fail-text' : ''}` },
        rate === null ? '—' : `${rate}%`,
      ),
      h(
        'div',
        { class: 'stat-note' },
        ran === 0 ? '결과 없음' : `통과 ${totals.passed} · `,
        ran === 0
          ? null
          : h('span', { class: totals.failed > 0 ? 'fail-text' : null }, `실패 ${totals.failed}`),
      ),
    ),
    h(
      'div',
      { class: 'stat' },
      h('div', { class: 'stat-label' }, '값 커버리지'),
      h(
        'div',
        { class: 'stat-value' },
        `${coverage}%`,
        h('span', { class: 'stat-unit' }, ` ${totals.covered}/${totals.values} 값`),
      ),
      bar,
      h(
        'div',
        { class: 'stat-note' },
        `이유 있음 ${totals.reason} · `,
        h('span', { class: 'missing-text' }, `빠짐 ${totals.missing}`),
      ),
    ),
    lastRun,
  );
}

/**
 * 여러 행위에서 함께 빠진 값 줄을 그린다. 누르면 그 값이 빠진 행위만 거른다.
 */
function renderCommon() {
  const common = document.getElementById('common');
  const items = state.table.commonMissing;
  common.hidden = items.length === 0;
  common.replaceChildren(h('span', { class: 'label' }, '여러 행위에서 함께 빠진 값'));
  for (const item of items) {
    const selected = state.common?.label === item.label && state.common?.value === item.value;
    const element = button(
      `${item.label} · ${item.value} `,
      () => {
        state.common = selected ? null : item;
        render();
      },
      `chip${selected ? ' selected' : ''}`,
    );
    element.append(h('span', { class: 'count' }, `${item.behaviors.length}개 행위`));
    element.setAttribute('aria-pressed', String(selected));
    common.append(element);
  }
}

/**
 * 거르기 줄(검색, 결과, 빠진 값만, 이번 PR만)을 그린다. 검색 칸은 다시 그리지 않아 입력 중 포커스를 지킨다.
 */
function renderFilters() {
  const filters = document.getElementById('filters');
  if (filters.childElementCount === 0) {
    const search = h('input', {
      type: 'search',
      class: 'search',
      placeholder: '시나리오·기대 결과·조건 값으로 찾기',
      'aria-label': '찾기',
    });
    search.addEventListener('input', () => {
      state.query = search.value.trim().toLowerCase();
      render();
    });
    filters.append(
      search,
      h('span', { id: 'filter-buttons', class: 'filter-buttons' }),
      h('span', { id: 'filter-count', class: 'muted filter-count' }),
    );
  }
  const failed = state.table.behaviors
    .flatMap((behavior) => behavior.cases)
    .filter((row) => isFail(caseStatus(row))).length;
  const group = h('span', { class: 'segmented', role: 'group', 'aria-label': '결과' });
  for (const [value, label] of [
    ['all', '모든 결과'],
    ['failed', `실패만 ${failed}`],
    ['passed', '통과만'],
  ]) {
    const element = button(
      label,
      () => {
        state.result = value;
        render();
      },
      `seg-button${state.result === value ? ' selected' : ''}`,
    );
    element.setAttribute('aria-pressed', String(state.result === value));
    group.append(element);
  }
  const toggles = [group, toggle('빠진 값만', state.missingOnly, (on) => (state.missingOnly = on))];
  if (state.table.changes !== null) {
    const affected = state.table.behaviors
      .flatMap((behavior) => behavior.cases)
      .filter((row) => row.affected).length;
    toggles.push(
      toggle(
        `이번 PR만 ${affected}`,
        state.prOnly,
        (on) => (state.prOnly = on),
        `${state.table.changes.base}과 비교해 바뀐 파일 ${state.table.changes.files.length}개의 영향을 받는 케이스`,
      ),
    );
  }
  document.getElementById('filter-buttons').replaceChildren(...toggles);
}

/**
 * 켜고 끄는 거르기 하나를 만든다.
 * @param {string} label 글자
 * @param {boolean} on 지금 켜졌는지
 * @param {(on: boolean) => void} set 바꾸기
 * @param {string} [title] 설명
 * @returns {HTMLElement} 체크박스와 글자
 */
function toggle(label, on, set, title) {
  const input = h('input', { type: 'checkbox' });
  input.checked = on;
  input.addEventListener('change', () => {
    set(input.checked);
    render();
  });
  return h('label', { class: 'toggle', title: title ?? null }, input, label);
}

/**
 * 왼쪽 영역·행위 목록을 그린다.
 */
function renderSide() {
  const side = document.getElementById('side');
  const { table } = state;
  const list = h('ul', { class: 'areas' });
  const all = button(
    '전체',
    () => {
      state.area = null;
      render();
    },
    `area-link${state.area === null ? ' selected' : ''}`,
  );
  all.append(h('span', { class: 'side-count' }, `${table.totals.cases}`));
  list.append(h('li', null, all));
  for (const area of table.areas) {
    const link = button(
      area.area,
      () => {
        state.area = state.area === area.area ? null : area.area;
        render();
      },
      `area-link${state.area === area.area ? ' selected' : ''}`,
    );
    link.append(
      h(
        'span',
        { class: 'side-count' },
        area.failed > 0 ? h('span', { class: 'fail-text' }, `✕${area.failed} `) : null,
        `${area.cases}`,
      ),
    );
    const behaviors = h('ul', { class: 'behavior-links' });
    for (const behavior of table.behaviors.filter((item) => item.area === area.area)) {
      const failed = behavior.cases.filter((row) => isFail(caseStatus(row))).length;
      const anyResult = behavior.cases.some((row) => caseStatus(row) !== null);
      const item = h(
        'a',
        { href: `#b-${behavior.id}`, class: behaviorVisible(behavior) ? null : 'dim' },
        statusDot(failed > 0 ? 'failed' : anyResult ? 'passed' : null),
        h('span', { class: 'side-name' }, behavior.name),
        behavior.counts.missing > 0
          ? h(
              'span',
              { class: 'side-missing', title: `빠진 값 ${behavior.counts.missing}` },
              String(behavior.counts.missing),
            )
          : null,
      );
      behaviors.append(h('li', null, item));
    }
    list.append(h('li', null, link, behaviors));
  }
  side.replaceChildren(h('div', { class: 'side-head muted' }, '영역 · 케이스 수 · 빠진 값'), list);
}

/**
 * 케이스 줄의 조건 꼬리(기준과 다른 것은 진하게)를 만든다.
 * @param {object} behavior 행위
 * @param {object} row 케이스 줄
 * @returns {HTMLElement} 조건 줄
 */
function conditionLine(behavior, row) {
  const line = h('div', { class: 'conds' });
  const changed = row.cells.filter((cell) => cell.changed);
  const same = row.cells.filter((cell) => !cell.changed);
  for (const cell of [...changed, ...same]) {
    const condition = behavior.conditions.find((item) => item.key === cell.key);
    line.append(
      h(
        'span',
        { class: cell.changed ? 'cond changed' : 'cond' },
        h('span', { class: 'cond-label' }, condition?.label ?? cell.key),
        ` ${cell.value}`,
      ),
    );
  }
  if (row.device !== null) {
    line.append(
      h('span', { class: 'cond' }, h('span', { class: 'cond-label' }, '장치'), ` ${row.device}`),
    );
  }
  return line;
}

/**
 * 케이스 줄 오른쪽 칸(결과, 걸린 시간, 돌린 시각 또는 실행해보기)을 만든다.
 * @param {object} row 케이스 줄
 * @returns {HTMLElement} 칸
 */
function resultCell(row) {
  const cell = h('div', { class: 'case-result' });
  if (state.table.mode === 'local') {
    const run = state.runs[row.grepToken];
    if (run !== undefined) {
      cell.append(
        h(
          'div',
          { class: isFail(run.status) ? 'fail-text' : null },
          statusText[run.status] ?? run.status,
        ),
      );
      if (run.finishedAt !== null) {
        cell.append(
          h(
            'div',
            { class: 'muted' },
            formatDuration(Date.parse(run.finishedAt) - Date.parse(run.startedAt)),
          ),
          h('div', { class: 'muted' }, formatTime(run.finishedAt)),
        );
      }
    }
    const running = Object.values(state.runs).some((item) => item.status === 'running');
    const start = button('실행해보기', () => void startRun(row.grepToken), 'small-button');
    start.disabled = running;
    cell.append(start);
    return cell;
  }
  if (row.result === null) {
    cell.append(h('div', { class: 'muted' }, '결과 없음'));
    return cell;
  }
  cell.append(
    h(
      'div',
      { class: isFail(row.result.status) ? 'fail-text' : null },
      statusText[row.result.status] ?? row.result.status,
    ),
    h('div', { class: 'muted' }, formatDuration(row.result.durationMs)),
  );
  if (state.table.run !== null) {
    cell.append(h('div', { class: 'muted' }, formatTime(state.table.run.time)));
  }
  return cell;
}

/**
 * 케이스 줄 하나를 만든다. 누르면 근거와 결과를 펼친다.
 * @param {object} behavior 행위
 * @param {object} row 케이스 줄
 * @param {boolean} [withBehavior] 행위 이름을 함께 보일지(실패 목록)
 * @returns {HTMLElement} 케이스 줄
 */
function caseRow(behavior, row, withBehavior = false) {
  const openKey = `${withBehavior ? 'f:' : ''}${row.key}`;
  const isOpen = state.open.has(openKey);
  const status = caseStatus(row);
  const head = h(
    'div',
    {
      class: `case-head${isFail(status) ? ' failed' : ''}`,
      role: 'button',
      tabindex: '0',
      'aria-expanded': String(isOpen),
    },
    statusDot(status),
    h('span', { class: 'case-number mono' }, `#${row.number}`),
    h(
      'div',
      { class: 'case-body' },
      withBehavior
        ? h('div', { class: 'muted crumb' }, `${behavior.area} › ${behavior.name}`)
        : null,
      h(
        'div',
        { class: 'scenario' },
        row.scenario,
        row.affected && state.table.changes !== null
          ? h('span', { class: 'pr-mark' }, '이번 PR')
          : null,
      ),
      h('div', { class: 'expected' }, `→ ${row.expected.join(' · ')}`),
      conditionLine(behavior, row),
      row.problems.length > 0 ? h('div', { class: 'problem' }, row.problems.join(' · ')) : null,
    ),
    resultCell(row),
  );
  /** 펼치거나 접는다. */
  function flip() {
    if (state.open.has(openKey)) {
      state.open.delete(openKey);
    } else {
      state.open.add(openKey);
    }
    render();
  }
  head.addEventListener('click', flip);
  head.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flip();
    }
  });
  return h(
    'div',
    { class: 'case', id: withBehavior ? null : `c-${row.key.replace('/', '--')}` },
    head,
    isOpen ? caseDetail(behavior, row) : null,
  );
}

/**
 * 기대 결과 체크리스트를 만든다. 결과가 없으면 목록만 보인다.
 * @param {object} row 케이스 줄
 * @returns {HTMLElement} 체크리스트
 */
function checklist(row) {
  let checks = null;
  if (state.table.mode === 'local') {
    const run = state.runs[row.grepToken];
    if (run !== undefined && run.status !== 'running') {
      checks = row.expected.map((name) => {
        const steps = run.steps.filter((step) => step.title === name);
        if (steps.length === 0) {
          return { name, status: 'unchecked' };
        }
        return { name, status: steps.some((step) => step.failed) ? 'failed' : 'passed' };
      });
    }
  } else if (row.result !== null && row.result.checks.length > 0) {
    checks = row.result.checks;
  }
  const list = h('ul', { class: 'checks' });
  for (const [index, name] of row.expected.entries()) {
    const check = checks?.[index];
    list.append(
      h(
        'li',
        { class: check === undefined ? null : `check ${check.status}` },
        h(
          'span',
          { class: 'check-mark mono', title: check === undefined ? '' : checkText[check.status] },
          check === undefined ? '·' : checkMark[check.status],
        ),
        name,
        check?.status === 'unchecked' ? h('span', { class: 'muted' }, ' 확인 못 함') : null,
      ),
    );
  }
  return list;
}

/**
 * 실행 화면 필름 띠를 만든다.
 * @param {object} row 케이스 줄
 * @returns {HTMLElement | null} 필름 띠. 없으면 null
 */
function filmStrip(row) {
  const film = row.result?.film ?? [];
  if (film.length === 0) {
    return null;
  }
  const strip = h('div', { class: 'film' });
  for (const frame of film) {
    strip.append(
      h(
        'figure',
        { class: frame.failed ? 'frame failed' : 'frame' },
        h('img', { src: frame.src, alt: `${formatDuration(frame.atMs)} 화면` }),
        h(
          'figcaption',
          { class: 'mono' },
          frame.failed ? `실패 지점 · ${formatDuration(frame.atMs)}` : formatDuration(frame.atMs),
        ),
      ),
    );
  }
  return strip;
}

/**
 * GitHub 파일 주소를 만든다.
 * @param {string} file 저장소 기준 경로
 * @param {number | null} line 줄
 * @returns {string} 주소
 */
function githubUrl(file, line) {
  const sha = state.table.run?.commit;
  const ref = sha === undefined || sha === 'local' ? 'main' : sha;
  return `${state.table.repoUrl}/blob/${ref}/${file}${line === null ? '' : `#L${line}`}`;
}

/**
 * 근거 문서 링크 하나를 만든다. 누르면 옆 패널에 섹션 본문을 연다.
 * @param {object} doc 문서 링크
 * @returns {HTMLElement} 링크
 */
function docLink(doc) {
  return h(
    'div',
    { class: 'doc' },
    button(
      `${doc.doc} › ${doc.section}`,
      () => openPanel(doc.link),
      doc.found ? 'link' : 'link not-found',
    ),
    doc.found ? null : h('span', { class: 'problem' }, ' 문서에 없음'),
    doc.firstLine === '' ? null : h('div', { class: 'doc-line' }, doc.firstLine),
  );
}

/**
 * 케이스를 펼친 내용(오류, 기대 결과, 필름 띠, 버튼, 근거, 코드)을 만든다.
 * @param {object} behavior 행위
 * @param {object} row 케이스 줄
 * @returns {HTMLElement} 펼친 내용
 */
function caseDetail(behavior, row) {
  const detail = h('div', { class: 'case-detail' });
  const error =
    state.table.mode === 'local' ? state.runs[row.grepToken]?.message : row.result?.error;
  if (error) {
    const failedCheck = row.result?.checks.find((check) => check.status === 'failed');
    detail.append(
      h(
        'div',
        { class: 'error' },
        failedCheck
          ? h('div', { class: 'error-title' }, `실패한 확인 · ${failedCheck.name}`)
          : null,
        h('pre', null, error),
      ),
    );
  }
  const left = h('div', { class: 'detail-col' }, h('h4', null, '기대 결과'), checklist(row));
  if (row.history.length > 0) {
    const trail = h('div', { class: 'history muted' }, `최근 ${row.history.length}번 `);
    for (const status of row.history) {
      trail.append(
        h('span', {
          class: `tick ${isPass(status) ? 'pass' : 'fail'}`,
          title: statusText[status] ?? status,
        }),
      );
    }
    left.append(trail);
  }
  left.append(h('h4', null, '근거'));
  for (const doc of row.docs) {
    left.append(docLink(doc));
  }
  const code = h(
    'details',
    { class: 'code' },
    h('summary', null, '실행 코드'),
    h('pre', null, row.source),
  );
  const refs = row.docs.flatMap((doc) => state.table.sections[doc.link]?.code ?? []);
  const unique = refs.filter(
    (ref, index) =>
      refs.findIndex((other) => other.file === ref.file && other.line === ref.line) === index,
  );
  const codeRefs = h(
    'details',
    { class: 'code' },
    h('summary', null, `이 규칙을 구현한 코드 ${unique.length}곳`),
    codeRefList(unique),
  );
  left.append(code, codeRefs);

  const right = h('div', { class: 'detail-col' });
  const film = filmStrip(row);
  if (film !== null) {
    right.append(h('h4', null, '실행 화면'), film);
  }
  const actions = h('div', { class: 'actions' });
  if (state.table.mode === 'report' && row.result?.trace) {
    const traceUrl = new URL(row.result.trace, location.href).href;
    actions.append(
      h(
        'a',
        {
          class: 'small-button primary',
          href: `${TRACE_VIEWER}${encodeURIComponent(traceUrl)}`,
          target: '_blank',
          rel: 'noopener',
        },
        'Trace 열기',
      ),
    );
  }
  if (state.table.mode === 'local') {
    const run = state.runs[row.grepToken];
    if (run?.trace && run.status !== 'running') {
      actions.append(
        button(
          'Trace 열기',
          () =>
            void fetch('api/open-trace', {
              method: 'POST',
              body: JSON.stringify({ token: row.grepToken }),
            }),
          'small-button primary',
        ),
      );
    }
  }
  actions.append(
    button(
      '고르는 표시 복사',
      () => void navigator.clipboard.writeText(row.grepToken),
      'small-button',
    ),
    h(
      'a',
      {
        class: 'small-button',
        href: githubUrl(behavior.file, row.line),
        target: '_blank',
        rel: 'noopener',
      },
      '정의 파일',
    ),
    h('span', { class: 'mono muted' }, row.grepToken),
  );
  right.append(actions);
  detail.append(h('div', { class: 'detail-grid' }, left, right));
  return detail;
}

/**
 * 코드 근거 목록을 만든다.
 * @param {object[]} refs 코드 근거
 * @returns {HTMLElement} 목록
 */
function codeRefList(refs) {
  const list = h('ul', { class: 'code-refs' });
  if (refs.length === 0) {
    list.append(h('li', { class: 'muted' }, '이 섹션에 연결된 제품 코드가 없다'));
  }
  for (const ref of refs) {
    list.append(
      h(
        'li',
        null,
        h(
          'a',
          { href: githubUrl(ref.file, ref.line), target: '_blank', rel: 'noopener', class: 'mono' },
          `${ref.file}:${ref.line}`,
        ),
        ' ',
        h('strong', null, ref.name ?? '(선언 못 찾음)'),
        ref.description === '' ? null : h('span', { class: 'muted' }, ` ${ref.description}`),
      ),
    );
  }
  return list;
}

/**
 * 케이스를 묶음(기준, 한 조건만 다름, 함께 다름)으로 나눈다.
 * @param {object} behavior 행위
 * @param {object[]} rows 보일 케이스
 * @returns {{ title: string, rows: object[] }[]} 묶음
 */
function groupCases(behavior, rows) {
  const groups = new Map();
  for (const row of rows) {
    const labels = row.changedKeys.map(
      (key) => behavior.conditions.find((condition) => condition.key === key)?.label ?? key,
    );
    let title = '기준';
    if (labels.length === 1) {
      title = `${labels[0]} 다름`;
    } else if (labels.length > 1) {
      title = `함께 다름: ${labels.join(' · ')}`;
    }
    const group = groups.get(title) ?? { title, rows: [] };
    group.rows.push(row);
    groups.set(title, group);
  }
  return [...groups.values()];
}

/**
 * 조건 × 값 지도를 만든다. 칸은 케이스 있음(번호), 이유 있음(회색), 빠짐(주황) 세 가지다.
 * @param {object} behavior 행위
 * @returns {HTMLElement} 지도
 */
function valueMap(behavior) {
  const columns = Math.max(...behavior.conditions.map((condition) => condition.values.length));
  const map = h('div', { class: 'map', style: `--columns:${columns}` });
  for (const condition of behavior.conditions) {
    const cells = h('div', { class: 'map-cells' });
    let opened = null;
    for (const cell of condition.values) {
      const key = cellKey(behavior.id, condition.key, cell.value);
      const isBase = cell.value === condition.base;
      const highlighted =
        state.common !== null &&
        state.common.label === condition.label &&
        state.common.value === cell.value;
      const body = [
        h('span', { class: 'map-value' }, cell.value),
        h(
          'span',
          { class: 'map-note mono' },
          isBase ? h('span', { class: 'base-mark' }, '기준 ') : null,
          cell.state === 'case' ? cell.cases.map((number) => `#${number}`).join(' ') : null,
          cell.state === 'reason' ? '이유 있음' : null,
          cell.state === 'missing' ? '빠짐' : null,
        ),
      ];
      if (cell.state === 'case') {
        cells.append(
          h('div', { class: `map-cell case${highlighted ? ' highlight' : ''}` }, ...body),
        );
        continue;
      }
      const isOpen = state.openCell === key;
      const element = button(
        '',
        () => {
          state.openCell = isOpen ? null : key;
          render();
        },
        `map-cell ${cell.state}${isOpen ? ' open' : ''}${highlighted ? ' highlight' : ''}`,
      );
      element.replaceChildren(...body);
      element.setAttribute('aria-expanded', String(isOpen));
      cells.append(element);
      if (isOpen) {
        opened = cell;
      }
    }
    map.append(
      h(
        'div',
        { class: 'map-row' },
        h(
          'div',
          { class: 'map-label' },
          condition.label,
          h('span', { class: 'mono muted' }, ` ${condition.key}`),
        ),
        cells,
      ),
    );
    if (opened !== null) {
      map.append(cellDetail(condition, opened));
    }
  }
  return map;
}

/**
 * 지도 칸을 펼친 내용을 만든다. 이유 있는 칸은 이유와 근거를, 빠진 칸은 제안과 붙일 뼈대를 보인다.
 * @param {object} condition 조건
 * @param {object} cell 칸
 * @returns {HTMLElement} 펼친 내용
 */
function cellDetail(condition, cell) {
  const detail = h('div', { class: `cell-detail ${cell.state}` });
  if (cell.state === 'reason') {
    detail.append(
      h('div', { class: 'cell-title' }, `케이스 없음 · ${condition.label} = ${cell.value}`),
      h('p', null, cell.noCase.reason),
      ...cell.noCase.docs.map((doc) => docLink(doc)),
    );
    return detail;
  }
  const { suggestion } = cell;
  const left = h(
    'div',
    null,
    h('div', { class: 'cell-title missing-text' }, `빠진 값 · ${condition.label} = ${cell.value}`),
    h('div', { class: 'muted small' }, '제안 시나리오(도구가 기준 케이스에서 만든 것)'),
    h('p', null, suggestion.scenario),
  );
  if (suggestion.rule !== null) {
    left.append(
      h('div', { class: 'muted small' }, '근거 문서에서 찾은 문장'),
      h(
        'blockquote',
        null,
        suggestion.rule.sentence,
        ' ',
        button(suggestion.rule.link, () => openPanel(suggestion.rule.link)),
      ),
    );
  } else {
    left.append(
      h('div', { class: 'muted small' }, '케이스 근거 섹션에서 이 값을 다룬 문장을 찾지 못했다.'),
    );
  }
  left.append(
    h('div', { class: 'muted small' }, '케이스를 만들거나, 만들지 않을 이유를 noCase에 적는다.'),
  );
  const right = h('div', { class: 'skeletons' });
  for (const [title, text] of [
    ['케이스 뼈대', suggestion.caseSkeleton],
    ['noCase 뼈대', suggestion.noCaseSkeleton],
  ]) {
    right.append(
      h(
        'div',
        { class: 'skeleton-head' },
        h('span', null, title),
        button('복사', () => void navigator.clipboard.writeText(text), 'small-button'),
      ),
      h('pre', null, text),
    );
  }
  detail.append(left, right);
  return detail;
}

/**
 * 행위 카드 하나를 만든다.
 * @param {object} behavior 행위
 * @returns {HTMLElement} 카드
 */
function behaviorCard(behavior) {
  const rows = behavior.cases.filter((row) => caseVisible(behavior, row));
  const passed = behavior.cases.filter((row) => isPass(caseStatus(row))).length;
  const failed = behavior.cases.filter((row) => isFail(caseStatus(row))).length;
  const results = [];
  if (failed > 0) {
    results.push(h('span', { class: 'fail-text' }, `실패 ${failed}`));
  }
  if (passed > 0) {
    results.push(h('span', null, `통과 ${passed}`));
  }
  const card = h(
    'article',
    { class: 'behavior', id: `b-${behavior.id}` },
    h(
      'header',
      { class: 'behavior-head' },
      h('h3', null, behavior.name),
      h(
        'div',
        { class: 'behavior-results' },
        ...results.flatMap((item, index) => (index === 0 ? [item] : [' · ', item])),
      ),
    ),
    h(
      'div',
      { class: 'behavior-meta muted' },
      `케이스 ${behavior.cases.length} · 조건 ${behavior.conditions.length} · 값 ${behavior.counts.values} (케이스 ${behavior.counts.covered} · 이유 ${behavior.counts.reason} · `,
      h(
        'span',
        { class: behavior.counts.missing > 0 ? 'missing-text' : null },
        `빠짐 ${behavior.counts.missing}`,
      ),
      ') · ',
      h(
        'a',
        { class: 'mono', href: githubUrl(behavior.file, null), target: '_blank', rel: 'noopener' },
        behavior.file.split('/').at(-1),
      ),
    ),
  );
  if (behavior.problems.length > 0) {
    card.append(h('div', { class: 'problem' }, behavior.problems.join(' · ')));
  }
  card.append(h('h4', { class: 'section-title' }, '조건 × 값'), valueMap(behavior));
  if (!state.missingOnly) {
    card.append(h('h4', { class: 'section-title' }, '케이스'));
    for (const group of groupCases(behavior, rows)) {
      card.append(
        h(
          'div',
          { class: 'group-title' },
          group.title,
          h('span', { class: 'muted' }, ` ${group.rows.length}`),
        ),
      );
      for (const row of group.rows) {
        card.append(caseRow(behavior, row));
      }
    }
  }
  return card;
}

/**
 * 실패한 케이스를 맨 위에 모아 그린다.
 * @returns {HTMLElement | null} 실패 목록. 없으면 null
 */
function failedSection() {
  if (state.missingOnly || state.result === 'passed') {
    return null;
  }
  const failed = state.table.behaviors.flatMap((behavior) =>
    behaviorVisibleForFailed(behavior)
      ? behavior.cases
          .filter((row) => isFail(caseStatus(row)) && caseVisible(behavior, row))
          .map((row) => [behavior, row])
      : [],
  );
  if (failed.length === 0) {
    return null;
  }
  return h(
    'section',
    { class: 'failed-list', 'aria-label': '실패한 케이스' },
    h('h2', { class: 'fail-text' }, `실패한 케이스 ${failed.length}`),
    ...failed.map(([behavior, row]) => caseRow(behavior, row, true)),
  );
}

/**
 * 실패 목록에 행위를 넣을지 본다(영역·함께 빠진 값 거르기만 따른다).
 * @param {object} behavior 행위
 * @returns {boolean} 넣으면 true
 */
function behaviorVisibleForFailed(behavior) {
  return (
    (state.area === null || behavior.area === state.area) &&
    (state.common === null || state.common.behaviors.includes(behavior.id))
  );
}

/**
 * 본문(실패 목록, 영역별 행위 카드)을 그린다.
 */
function renderMain() {
  const main = document.getElementById('main');
  const parts = [];
  const failed = failedSection();
  if (failed !== null) {
    parts.push(failed);
  }
  let behaviors = 0;
  let cases = 0;
  for (const area of state.table.areas) {
    const visible = state.table.behaviors.filter(
      (behavior) => behavior.area === area.area && behaviorVisible(behavior),
    );
    if (visible.length === 0) {
      continue;
    }
    behaviors += visible.length;
    cases += visible.reduce(
      (sum, behavior) => sum + behavior.cases.filter((row) => caseVisible(behavior, row)).length,
      0,
    );
    parts.push(
      h(
        'section',
        { class: 'area' },
        h(
          'h2',
          null,
          area.area,
          h(
            'span',
            { class: 'muted area-meta' },
            ` 행위 ${area.behaviors} · 케이스 ${area.cases} · 빠진 값 ${area.missing}`,
          ),
        ),
        ...visible.map((behavior) => behaviorCard(behavior)),
      ),
    );
  }
  if (behaviors === 0) {
    parts.push(h('p', { class: 'muted empty' }, '거르기에 맞는 행위가 없다.'));
  }
  document.getElementById('filter-count').textContent = state.missingOnly
    ? `행위 ${behaviors}`
    : `행위 ${behaviors} · 케이스 ${cases}`;
  main.replaceChildren(...parts);
}

/**
 * 마크다운 한 줄 안의 꾸밈(코드, 굵게, 문서 링크)을 요소로 만든다.
 * @param {string} text 글자
 * @returns {Node[]} 요소들
 */
function inline(text) {
  const nodes = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\[\[([^\]]+)\]\]/gu;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(h('code', null, match[1]));
    } else if (match[2] !== undefined) {
      nodes.push(h('strong', null, match[2]));
    } else {
      const link = `[[${match[3]}]]`;
      nodes.push(
        state.table.sections[link]
          ? button(link, () => openPanel(link))
          : h('span', { class: 'doc-ref' }, link),
      );
    }
    last = match.index + match[0].length;
  }
  nodes.push(text.slice(last));
  return nodes;
}

/**
 * 섹션 본문(마크다운의 문단·목록·표·코드)을 그린다.
 * @param {string} body 본문
 * @returns {HTMLElement} 그린 본문
 */
function markdown(body) {
  const root = h('div', { class: 'md' });
  const lines = body.split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.startsWith('```')) {
      const code = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      root.append(h('pre', null, code.join('\n')));
      index += 1;
    } else if (line.trim().startsWith('|')) {
      const table = h('table', null);
      let header = true;
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        const cells = (lines[index] ?? '')
          .trim()
          .replace(/^\||\|$/gu, '')
          .split('|');
        if (!cells.every((cell) => /^\s*:?-+:?\s*$/u.test(cell))) {
          table.append(
            h(
              'tr',
              null,
              ...cells.map((cell) => h(header ? 'th' : 'td', null, ...inline(cell.trim()))),
            ),
          );
          header = false;
        }
        index += 1;
      }
      root.append(table);
    } else if (/^\s*(?:[-*]|\d+\.)\s/u.test(line)) {
      const list = h('ul', null);
      while (index < lines.length && /^\s*(?:[-*]|\d+\.)\s/u.test(lines[index] ?? '')) {
        list.append(
          h('li', null, ...inline((lines[index] ?? '').replace(/^\s*(?:[-*]|\d+\.)\s/u, ''))),
        );
        index += 1;
      }
      root.append(list);
    } else if (line.trim() === '') {
      index += 1;
    } else {
      root.append(h('p', null, ...inline(line)));
      index += 1;
    }
  }
  return root;
}

/**
 * 옆 패널에 문서 섹션을 연다.
 * @param {string} link `[[문서:섹션]]`
 */
function openPanel(link) {
  state.panel = link;
  renderPanel();
}

/**
 * 옆 패널(섹션 본문, 이 섹션을 근거로 삼는 케이스, 연결된 코드)을 그린다.
 */
function renderPanel() {
  const panel = document.getElementById('panel');
  const section = state.panel === null ? undefined : state.table.sections[state.panel];
  if (section === undefined) {
    panel.hidden = true;
    return;
  }
  const users = state.table.behaviors.flatMap((behavior) =>
    behavior.cases
      .filter((row) => row.docs.some((doc) => doc.link === section.link))
      .map((row) => [behavior, row]),
  );
  const close = button(
    '닫기',
    () => {
      state.panel = null;
      renderPanel();
    },
    'small-button',
  );
  const usersList = h('ul', { class: 'panel-cases' });
  for (const [behavior, row] of users) {
    usersList.append(
      h(
        'li',
        null,
        statusDot(caseStatus(row)),
        h('a', { href: `#b-${behavior.id}` }, `${behavior.name} #${row.number}`),
      ),
    );
  }
  panel.replaceChildren(
    h(
      'div',
      { class: 'panel-head' },
      h(
        'div',
        null,
        h('div', { class: 'muted small' }, section.doc),
        h('h3', null, section.section),
        section.path === null ? null : h('div', { class: 'mono muted small' }, section.path),
      ),
      close,
    ),
    section.body === ''
      ? h('p', { class: 'problem' }, '문서에 이 섹션이 없다')
      : markdown(section.body),
    h('h4', null, `이 섹션을 근거로 삼는 케이스 ${users.length}`),
    usersList,
    h('h4', null, `이 섹션을 구현한 코드 ${section.code.length}`),
    codeRefList(section.code),
  );
  panel.hidden = false;
}

/**
 * 화면 전체를 다시 그린다.
 */
function render() {
  renderMeta();
  renderSummary();
  renderCommon();
  renderFilters();
  renderSide();
  renderMain();
  renderPanel();
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
 * 케이스 하나를 실행해보기로 돌린다.
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
 * 화면 데이터를 읽어 처음 그린다.
 */
async function start() {
  const response = await fetch('table.json', { cache: 'no-store' });
  state.table = await response.json();
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.panel !== null) {
      state.panel = null;
      renderPanel();
    }
  });
  render();
  if (state.table.mode === 'local') {
    await refreshRuns();
  }
}

void start();
