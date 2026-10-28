import type {
  ConnectionResult,
  ExportMessage,
  ExportOutcome,
  ExportProgress,
  MainMessage,
  PullRequestCommit,
  RepoStatus,
  UiMessage,
  ViolationGroup,
  ViolationLine,
} from '../messages';
import { matchPasteNames, parsePasteText } from './paste-selection';
import {
  buildCatalog,
  type Catalog,
  type CatalogGroup,
  type CatalogItem,
  estimatePullRequests,
  filterItems,
  groupSelection,
  type ItemKind,
  TOKENS_KEY,
} from './target-catalog';

// 플러그인 UI. 머리줄·선택 도구줄·대상 목록·아래 고정줄과, 목록 자리에 바뀌어 들어가는 설정·진행·결과 화면을 그린다.
// 선택·묶음·붙여넣기 계산은 target-catalog.ts, paste-selection.ts의 순수 함수가 맡고, 여기서는 상태와 DOM만 다룬다.

/** 목록 자리에 보이는 화면 */
type View = 'list' | 'settings' | 'run';

/** 내보내기 진행·결과 상태 */
type RunState = {
  isRunning: boolean;
  progress: ExportProgress | null;
  logs: string[];
  notices: string[];
  outcome: ExportOutcome | null;
  failure: string | null;
};

// 종류별 이름(결과 묶음과 목록 제목)
const KIND_TITLES = {
  tokens: '토큰',
  component: '컴포넌트',
  pattern: '조립',
  motion: '애니메이션',
} as const;
// 결과 화면에서 PR을 묶는 순서
const RESULT_ORDER = ['tokens', 'component', 'pattern', 'motion'] as const;

const ui = {
  openSettings: element('open-settings', HTMLButtonElement),
  toolbar: element('toolbar', HTMLElement),
  paste: element('paste', HTMLTextAreaElement),
  pasteSelect: element('paste-select', HTMLButtonElement),
  pasteResult: element('paste-result', HTMLParagraphElement),
  clearSelection: element('clear-selection', HTMLButtonElement),
  filter: element('filter', HTMLInputElement),
  listView: element('view-list', HTMLElement),
  settingsView: element('view-settings', HTMLElement),
  runView: element('view-run', HTMLElement),
  settingsBack: element('settings-back', HTMLButtonElement),
  runBack: element('run-back', HTMLButtonElement),
  token: element('token', HTMLInputElement),
  tokenVisibility: element('token-visibility', HTMLButtonElement),
  checkConnection: element('check-connection', HTMLButtonElement),
  clearToken: element('clear-token', HTMLButtonElement),
  connection: element('connection', HTMLSpanElement),
  newTokenLink: element('new-token-link', HTMLAnchorElement),
  repoName: element('repo-name', HTMLElement),
  fileKey: element('file-key', HTMLElement),
  rulesLink: element('rules-link', HTMLAnchorElement),
  run: element('run', HTMLDivElement),
  selectionSummary: element('selection-summary', HTMLSpanElement),
  tokenHint: element('token-hint', HTMLSpanElement),
  exportButton: element('export', HTMLButtonElement),
};

/** 화면 상태 */
type State = {
  view: View;
  /** 본체가 목록을 보냈는지 */
  isLoaded: boolean;
  catalog: Catalog;
  /** 애니메이션을 내보낼 수 없을 때의 안내 */
  motionUnavailable: string | null;
  /** 고른 키(토큰은 TOKENS_KEY) */
  selected: Set<string>;
  /** 펼친 묶음 키 */
  expanded: Set<string>;
  isTokenDetailOpen: boolean;
  /** 목록 안 찾기 글자 */
  filter: string;
  repoStatus: RepoStatus;
  run: RunState;
  /** 마지막 내보내기 요청. "다시 내보내기"가 쓴다 */
  lastRequest: ExportMessage | null;
};

const state: State = {
  view: 'list',
  isLoaded: false,
  catalog: { groups: [], items: [] },
  motionUnavailable: null,
  selected: new Set(),
  expanded: new Set(),
  isTokenDetailOpen: false,
  filter: '',
  repoStatus: { kind: 'missing-token' },
  run: emptyRun(),
  lastRequest: null,
};

window.addEventListener('message', handleWindowMessage);
ui.openSettings.addEventListener('click', handleOpenSettingsClick);
ui.settingsBack.addEventListener('click', handleBackClick);
ui.runBack.addEventListener('click', handleBackClick);
ui.pasteSelect.addEventListener('click', handlePasteSelectClick);
ui.clearSelection.addEventListener('click', handleClearSelectionClick);
ui.filter.addEventListener('input', handleFilterInput);
ui.token.addEventListener('input', handleTokenInput);
ui.token.addEventListener('change', handleTokenChange);
ui.tokenVisibility.addEventListener('click', handleTokenVisibilityClick);
ui.checkConnection.addEventListener('click', handleCheckConnectionClick);
ui.clearToken.addEventListener('click', handleClearTokenClick);
ui.exportButton.addEventListener('click', handleExportClick);

/**
 * 피그마가 전달한 플러그인 본체 메시지를 꺼낸다.
 * @param event iframe 메시지 이벤트
 */
function handleWindowMessage(event: MessageEvent<{ pluginMessage?: MainMessage }>): void {
  const message = event.data.pluginMessage;
  if (message !== undefined) {
    handleMainMessage(message);
  }
}

/**
 * 플러그인 본체 메시지에 따라 상태를 바꾸고 다시 그린다.
 * @param message 본체가 보낸 메시지
 */
function handleMainMessage(message: MainMessage): void {
  switch (message.type) {
    case 'init':
      state.isLoaded = true;
      state.catalog = buildCatalog(message.components, message.patterns, message.motions);
      state.motionUnavailable = message.motionUnavailable;
      ui.token.value = message.token;
      ui.repoName.textContent = message.settings.repo;
      ui.fileKey.textContent = message.settings.fileKey;
      ui.rulesLink.href = message.settings.rulesUrl;
      ui.newTokenLink.href = message.settings.newTokenUrl;
      // 토큰이 없으면 설정부터 연다. 있으면 본체가 곧 저장소 비교 결과를 보낸다.
      state.view = message.token.trim() === '' ? 'settings' : 'list';
      state.repoStatus =
        message.token.trim() === '' ? { kind: 'missing-token' } : { kind: 'loading' };
      break;
    case 'repo-status':
      state.repoStatus = message.status;
      break;
    case 'connection':
      showConnection(message.result);
      return;
    case 'log':
      state.run.logs.push(message.text);
      break;
    case 'progress':
      state.run.progress = message.progress;
      break;
    case 'notices':
      state.run.notices = message.notices;
      break;
    case 'done':
      state.run.isRunning = false;
      state.run.outcome = message.result;
      break;
    case 'failed':
      if (!state.run.isRunning && state.view !== 'run') {
        // 내보내기 밖의 실패(목록 읽기 등)도 진행·결과 화면에서 보인다.
        state.view = 'run';
      }
      state.run.isRunning = false;
      state.run.failure = message.message;
      break;
  }
  render();
}

/**
 * ⚙을 누르면 설정 화면을 연다. 설정 화면에서 다시 누르면 목록으로 돌아간다.
 */
function handleOpenSettingsClick(): void {
  state.view = state.view === 'settings' ? 'list' : 'settings';
  render();
}

/**
 * "목록으로 돌아가기"로 목록 화면을 연다.
 */
function handleBackClick(): void {
  state.view = 'list';
  render();
}

/**
 * 붙여넣은 이름으로 선택을 바꾼다. 지금 선택을 지우고 붙여넣은 대상만 고른 뒤, 고른 항목이 든 묶음을 펼친다.
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function handlePasteSelectClick(): void {
  const match = matchPasteNames(parsePasteText(ui.paste.value), state.catalog.items);
  state.selected = new Set(match.keys);
  for (const item of state.catalog.items) {
    if (state.selected.has(item.key)) {
      state.expanded.add(item.groupKey);
    }
  }
  const parts: (Node | string)[] = [`${String(match.keys.length)}개 선택`];
  if (match.notFound.length > 0) {
    parts.push(' · ', make('span', 'missing', `찾지 못함: ${match.notFound.join(', ')}`));
  }
  ui.pasteResult.replaceChildren(...parts);
  ui.pasteResult.hidden = false;
  render();
}

/**
 * 선택을 모두 지운다.
 */
function handleClearSelectionClick(): void {
  state.selected.clear();
  ui.pasteResult.hidden = true;
  render();
}

/**
 * 목록 안 찾기 글자를 바꾼다.
 */
function handleFilterInput(): void {
  state.filter = ui.filter.value;
  render();
}

/**
 * 토큰을 입력하면 바로 저장한다.
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function handleTokenInput(): void {
  post({ type: 'save-token', token: ui.token.value });
  ui.connection.textContent = '';
  render();
}

/**
 * 토큰 입력을 마치면 저장소와 다시 비교한다.
 */
function handleTokenChange(): void {
  post({ type: 'refresh-status', token: ui.token.value });
}

/**
 * 토큰 가림·보기를 바꾼다.
 */
function handleTokenVisibilityClick(): void {
  const isHidden = ui.token.type === 'password';
  ui.token.type = isHidden ? 'text' : 'password';
  ui.tokenVisibility.textContent = isHidden ? '가리기' : '보기';
}

/**
 * 저장소를 읽어 연결과 쓰기 권한을 확인한다.
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function handleCheckConnectionClick(): void {
  ui.connection.className = 'connection muted';
  ui.connection.textContent = '확인 중…';
  post({ type: 'check-connection', token: ui.token.value });
}

/**
 * 저장한 토큰을 지운다.
 */
function handleClearTokenClick(): void {
  ui.token.value = '';
  ui.connection.textContent = '';
  post({ type: 'save-token', token: '' });
  render();
}

/**
 * 고른 대상으로 내보내기를 요청하고 진행 화면을 연다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function handleExportClick(): void {
  /**
   * 고른 항목 가운데 한 종류의 노드 ID를 모은다.
   * @param kind 종류
   * @returns 노드 ID
   */
  function idsOf(kind: ItemKind): string[] {
    return state.catalog.items
      .filter((item) => item.kind === kind && state.selected.has(item.key))
      .map((item) => item.id);
  }
  startExport({
    type: 'export',
    token: ui.token.value,
    tokens: state.selected.has(TOKENS_KEY),
    componentIds: idsOf('component'),
    patternIds: idsOf('pattern'),
    motionIds: idsOf('motion'),
  });
}

/**
 * 내보내기를 시작한다. "다시 내보내기"는 같은 요청으로 이 함수를 부른다.
 * @param request 내보내기 요청
 */
function startExport(request: ExportMessage): void {
  state.lastRequest = request;
  state.run = { ...emptyRun(), isRunning: true };
  state.view = 'run';
  post(request);
  render();
}

/**
 * 연결 확인 결과를 보인다.
 * @param result 연결 확인 결과
 */
function showConnection(result: ConnectionResult): void {
  if (!result.ok) {
    ui.connection.className = 'connection bad';
    ui.connection.textContent = `연결 실패: ${result.message}`;
    return;
  }
  ui.connection.className = result.canPush ? 'connection ok' : 'connection bad';
  ui.connection.textContent = result.canPush
    ? `✓ 연결됨 · ${result.repo} · 쓰기 권한 있음`
    : `연결됨 · ${result.repo} · 쓰기 권한 없음(Contents·Pull requests 쓰기 권한을 준다)`;
}

/**
 * 상태대로 화면 전체를 그린다.
 */
function render(): void {
  ui.toolbar.hidden = state.view !== 'list';
  ui.listView.hidden = state.view !== 'list';
  ui.settingsView.hidden = state.view !== 'settings';
  ui.runView.hidden = state.view !== 'run';
  ui.openSettings.setAttribute('aria-pressed', String(state.view === 'settings'));
  if (state.view === 'list') {
    const { scrollTop } = ui.listView;
    renderList();
    ui.listView.scrollTop = scrollTop;
  } else if (state.view === 'run') {
    renderRun();
  }
  renderBottomBar();
}

/**
 * 아래 고정줄(고른 수 · 열릴 PR 수, 토큰 안내, 내보내기 버튼)을 그린다.
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function renderBottomBar(): void {
  const count = state.selected.size;
  const pullRequests = estimatePullRequests(state.catalog, state.selected, hasTokenChanges());
  ui.selectionSummary.textContent =
    count === 0 ? '고른 대상 없음' : `${String(count)}개 선택 · PR 약 ${String(pullRequests)}개`;
  const hasToken = ui.token.value.trim() !== '';
  ui.tokenHint.hidden = hasToken;
  ui.exportButton.disabled = count === 0 || !hasToken || state.run.isRunning;
  ui.runBack.disabled = state.run.isRunning;
}

/**
 * 토큰이 `main`과 다른지 구한다.
 * @returns 다르면 true, 같으면 false, 모르면 null
 */
function hasTokenChanges(): boolean | null {
  const status = state.repoStatus;
  if (status.kind !== 'ready' || status.tokens === null) {
    return null;
  }
  const { added, modified, renamed, removed } = status.tokens;
  return added.length + modified.length + renamed.length + removed.length > 0;
}

/**
 * 대상 목록(토큰 줄, 컴포넌트·조립·애니메이션 묶음)을 그린다. 목록 안 찾기에 걸린 항목만 보이고, 걸린 묶음은 펼친다.
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function renderList(): void {
  if (!state.isLoaded) {
    return;
  }
  const isFiltering = state.filter.trim() !== '';
  const visible = new Set(filterItems(state.catalog.items, state.filter).map((item) => item.key));
  const nodes: Node[] = [];
  if (!isFiltering || '토큰 tokens'.includes(state.filter.trim().toLowerCase())) {
    nodes.push(...tokenRow());
  }
  for (const kind of ['component', 'pattern', 'motion'] as const) {
    const groups = state.catalog.groups.filter((group) => group.kind === kind);
    const all = groups.flatMap((group) => group.items);
    const shown = groups
      .map((group) => ({ group, items: group.items.filter((item) => visible.has(item.key)) }))
      .filter(({ items }) => items.length > 0);
    if (isFiltering && shown.length === 0) {
      continue;
    }
    const selection = groupSelection(all, state.selected);
    nodes.push(
      make('h2', 'section-title', [
        KIND_TITLES[kind],
        make('span', 'count', `${String(selection.selected)} / ${String(selection.total)}`),
        make('span', 'status muted', sectionStatus()),
      ]),
    );
    if (kind === 'motion' && state.motionUnavailable !== null) {
      nodes.push(make('p', 'empty muted', state.motionUnavailable));
      continue;
    }
    if (all.length === 0) {
      nodes.push(make('p', 'empty muted', `${KIND_TITLES[kind]} 없음`));
      continue;
    }
    for (const { group, items } of shown) {
      nodes.push(groupBlock(group, items, isFiltering));
    }
  }
  if (isFiltering && nodes.length === 0) {
    nodes.push(make('p', 'empty muted', `"${state.filter.trim()}"가 든 대상이 없다.`));
  }
  ui.listView.replaceChildren(...nodes);
}

/**
 * 목록 제목 옆 상태 글자(저장소 비교 상태)를 구한다.
 * @returns 상태 글자
 */
function sectionStatus(): string {
  switch (state.repoStatus.kind) {
    case 'missing-token':
      return '상태: 설정 필요';
    case 'loading':
      return '저장소와 비교 중…';
    case 'error':
      return '저장소 비교 실패';
    case 'ready':
      return '';
  }
}

/**
 * 토큰 줄과, 펼쳤으면 바뀐 토큰 이름 목록을 만든다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @returns 토큰 줄 요소
 */
function tokenRow(): Node[] {
  const checkbox = checkboxFor(TOKENS_KEY, '토큰');
  const status = state.repoStatus;
  const meta = make('span', 'meta', []);
  const detail: Node[] = [];
  if (status.kind === 'missing-token') {
    meta.append(badge('warn', '설정 필요'));
  } else if (status.kind === 'loading') {
    meta.append(make('span', 'muted', 'main과 비교 중…'));
  } else if (status.kind === 'error') {
    meta.append(badge('warn', '비교 실패'));
    meta.title = status.message;
  } else if (status.tokens === null) {
    meta.append(badge('warn', '변환 실패'));
    meta.title = status.tokensError ?? '';
  } else {
    const { added, modified, renamed, removed } = status.tokens;
    const total = added.length + modified.length + renamed.length + removed.length;
    meta.append(
      make(
        'span',
        total === 0 ? 'muted' : '',
        total === 0
          ? 'main과 같음'
          : `추가 ${String(added.length)} · 변경 ${String(modified.length)} · 이름 변경 ${String(renamed.length)} · 삭제 ${String(removed.length)}`,
      ),
    );
    if (total > 0) {
      const toggle = make('button', 'link', state.isTokenDetailOpen ? '접기' : '자세히');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(state.isTokenDetailOpen));
      toggle.addEventListener('click', handleTokenDetailClick);
      meta.append(toggle);
    }
    if (state.isTokenDetailOpen && total > 0) {
      const lists: Node[] = [];
      for (const [title, names] of [
        ['추가', added],
        ['변경', modified],
        ['이름 변경', renamed.map(({ from, to }) => `${from} → ${to}`)],
        ['삭제', removed],
      ] as const) {
        if (names.length > 0) {
          lists.push(
            make('h3', '', `${title} ${String(names.length)}`),
            make(
              'ul',
              '',
              names.map((name) => make('li', '', name)),
            ),
          );
        }
      }
      detail.push(make('div', 'token-detail', lists));
    }
  }
  const label = make('label', '', [checkbox, make('span', 'name', '토큰')]);
  return [make('div', 'row token-row', [label, meta]), ...detail];
}

/**
 * 토큰 줄의 "자세히"로 바뀐 토큰 이름을 펼치거나 접는다.
 */
function handleTokenDetailClick(): void {
  state.isTokenDetailOpen = !state.isTokenDetailOpen;
  render();
}

/**
 * 묶음 하나(머리 줄과 펼친 항목)를 만든다. 묶음 체크박스는 보이는 항목을 모두 켜고 끈다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param group 묶음
 * @param items 보이는 항목
 * @param isFiltering 목록 안 찾기 중이면 true(걸린 묶음을 펼친다)
 * @returns 묶음 요소
 */
function groupBlock(group: CatalogGroup, items: CatalogItem[], isFiltering: boolean): HTMLElement {
  const isExpanded = isFiltering || state.expanded.has(group.key);
  const toggle = make('button', 'toggle', '▸');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', String(isExpanded));
  toggle.setAttribute('aria-label', `${group.title} ${isExpanded ? '접기' : '펼치기'}`);
  toggle.addEventListener('click', () => {
    toggleGroup(group.key);
  });

  const selection = groupSelection(group.items, state.selected);
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selection.state === 'all';
  checkbox.indeterminate = selection.state === 'some';
  checkbox.setAttribute('aria-label', `${group.title} 모두 고르기`);
  const keys = items.map((item) => item.key);
  checkbox.addEventListener('change', () => {
    setSelected(keys, checkbox.checked);
  });

  const meta = make('span', 'meta', [
    make('span', 'count', `${String(selection.selected)} / ${String(selection.total)}`),
  ]);
  if (group.kind === 'pattern') {
    meta.prepend(make('span', 'muted', 'PR 1개'));
  }
  const head = make('div', 'row group-head', [
    toggle,
    make('label', '', [checkbox, make('span', 'name', group.title)]),
    meta,
  ]);
  const block = make('div', 'group', [head]);
  if (isExpanded) {
    block.append(
      make(
        'ul',
        'items',
        items.map((item) => itemRow(item)),
      ),
    );
  }
  return block;
}

/**
 * 항목 한 줄(체크박스, 이름, 변형 수, 상태)을 만든다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param item 항목
 * @returns 목록 줄
 */
function itemRow(item: CatalogItem): HTMLLIElement {
  const meta = make('span', 'meta', []);
  const status = state.repoStatus;
  if (status.kind === 'ready' && status.newIds.includes(item.id)) {
    meta.append(badge('new', '새로 만듦'));
  }
  if (item.variantCount !== null) {
    meta.append(make('span', 'muted', `변형 ${String(item.variantCount)}`));
  }
  const label = make('label', '', [
    checkboxFor(item.key, item.name),
    make('span', 'name', item.name),
  ]);
  label.title = item.name;
  return make('li', 'row', [label, meta]);
}

/**
 * 선택 키에 묶인 체크박스를 만든다.
 * @param key 선택 키
 * @param name 접근성 이름
 * @returns 체크박스
 */
function checkboxFor(key: string, name: string): HTMLInputElement {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state.selected.has(key);
  checkbox.setAttribute('aria-label', name);
  checkbox.addEventListener('change', () => {
    setSelected([key], checkbox.checked);
  });
  return checkbox;
}

/**
 * 키를 고르거나 고르기를 풀고 다시 그린다.
 * @param keys 선택 키
 * @param isSelected 고르면 true
 */
function setSelected(keys: readonly string[], isSelected: boolean): void {
  for (const key of keys) {
    if (isSelected) {
      state.selected.add(key);
    } else {
      state.selected.delete(key);
    }
  }
  render();
}

/**
 * 묶음을 펼치거나 접고 다시 그린다.
 * @param key 묶음 키
 */
function toggleGroup(key: string): void {
  if (state.expanded.has(key)) {
    state.expanded.delete(key);
  } else {
    state.expanded.add(key);
  }
  render();
}

/**
 * 진행·결과 화면을 그린다.
 * @codocs [[피그마 연동:플러그인 화면]]
 */
function renderRun(): void {
  const { run } = state;
  const nodes: Node[] = [];
  if (run.isRunning) {
    nodes.push(progressBlock(run.progress));
  } else if (run.failure !== null) {
    nodes.push(
      make('p', 'headline bad', '내보내기가 멈췄다'),
      make('div', 'error-box', run.failure),
    );
  } else if (run.outcome?.kind === 'blocked') {
    nodes.push(...violationBlocks(run.outcome.groups));
  } else if (run.outcome?.kind === 'done') {
    nodes.push(...resultBlocks(run.outcome.commits, run.outcome.unchanged));
  }
  if (!run.isRunning) {
    if (run.notices.length > 0) {
      nodes.push(
        collapsible(
          `정리 알림 ${String(run.notices.length)}개 (막지 않음)`,
          make(
            'ul',
            '',
            run.notices.map((notice) => make('li', '', notice)),
          ),
        ),
      );
    }
    if (state.lastRequest !== null) {
      const again = make('button', '', '다시 내보내기');
      again.type = 'button';
      again.disabled = ui.token.value.trim() === '';
      again.addEventListener('click', handleExportAgainClick);
      nodes.push(make('div', 'actions', [again]));
    }
  }
  if (run.logs.length > 0) {
    nodes.push(
      collapsible(
        `자세한 로그 ${String(run.logs.length)}줄`,
        make('pre', 'log', run.logs.join('\n')),
      ),
    );
  }
  ui.run.replaceChildren(...nodes);
}

/**
 * 같은 선택으로 다시 내보낸다.
 */
function handleExportAgainClick(): void {
  if (state.lastRequest !== null) {
    startExport({ ...state.lastRequest, token: ui.token.value });
  }
}

/**
 * 진행 막대(대상 n / 전체)와 지금 하는 일 한 줄을 만든다.
 * @param progress 진행. 아직 없으면 null
 * @returns 진행 요소
 */
function progressBlock(progress: ExportProgress | null): HTMLElement {
  const phase = progress?.phase === 'commit' ? '커밋' : '검사';
  const done = progress?.done ?? 0;
  const total = progress?.total ?? 0;
  // 막대는 검사를 앞 절반, 커밋을 뒤 절반으로 채운다.
  const ratio = total === 0 ? 0 : done / total;
  const percent =
    Math.round((progress?.phase === 'commit' ? 50 + ratio * 50 : ratio * 50) * 10) / 10;
  const fill = make('div', '', []);
  fill.style.width = `${String(percent)}%`;
  const bar = make('div', 'bar', [fill]);
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(percent));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  return make('div', '', [
    make('div', 'progress-label', [
      make('span', '', `${phase} 중`),
      make('span', 'count', total === 0 ? '' : `대상 ${String(done)} / ${String(total)}`),
    ]),
    bar,
    make('p', 'now muted', progress?.text ?? '준비 중…'),
  ]);
}

/**
 * 커밋 결과를 PR 종류(토큰·컴포넌트·조립·애니메이션)별로 묶어 만든다. 바뀐 것 없음은 접어 둔다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param commits PR별 커밋
 * @param unchanged 바뀐 것이 없는 대상
 * @returns 결과 요소
 */
function resultBlocks(commits: readonly PullRequestCommit[], unchanged: readonly string[]): Node[] {
  const created = commits.filter((commit) => commit.isNewPullRequest).length;
  const nodes: Node[] = [
    make(
      'p',
      'headline',
      commits.length === 0
        ? '바뀐 것이 없어 커밋하지 않았다'
        : `PR ${String(commits.length)}개에 커밋했다 (새 PR ${String(created)} · 열린 PR ${String(commits.length - created)})`,
    ),
  ];
  for (const kind of RESULT_ORDER) {
    const group = commits.filter((commit) => commit.kind === kind);
    if (group.length === 0) {
      continue;
    }
    nodes.push(
      make('section', 'result-group', [
        make('h3', '', `${KIND_TITLES[kind]} ${String(group.length)}`),
        make(
          'ul',
          '',
          group.map((commit) => commitItem(commit)),
        ),
      ]),
    );
  }
  if (unchanged.length > 0) {
    nodes.push(
      collapsible(
        `바뀐 것 없음 ${String(unchanged.length)}개`,
        make(
          'ul',
          '',
          unchanged.map((name) => make('li', '', name)),
        ),
      ),
    );
  }
  return nodes;
}

/**
 * PR 하나의 결과 줄(대상, 새 PR·열린 PR, PR과 커밋 링크)을 만든다.
 * @param commit 커밋 결과
 * @returns 목록 항목
 */
function commitItem(commit: PullRequestCommit): HTMLLIElement {
  return make('li', '', [
    make('span', 'target', commit.target),
    commit.isNewPullRequest ? badge('new', '새 PR') : badge('', '열린 PR에 이어 커밋'),
    make('span', 'links', [link(commit.pullRequestUrl, 'PR ↗'), link(commit.commitUrl, '커밋 ↗')]),
  ]);
}

/**
 * 구조 검사 위반을 대상별로 묶어 만든다. 줄마다 그 레이어를 피그마에서 보는 버튼을 둔다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @codocs [[피그마 연동:구조 검사]]
 * @param groups 대상별 위반
 * @returns 위반 요소
 */
function violationBlocks(groups: readonly ViolationGroup[]): Node[] {
  const total = groups.reduce((sum, group) => sum + group.violations.length, 0);
  return [
    make(
      'p',
      'headline bad',
      `구조 검사 위반 ${String(total)}개 (대상 ${String(groups.length)}개) · 커밋하지 않았다`,
    ),
    make('p', 'muted', '고친 뒤 "다시 내보내기"로 같은 선택을 다시 내보낸다.'),
    ...groups.map((group) => violationGroupBlock(group)),
  ];
}

/**
 * 한 대상의 위반을 펼친 묶음으로 만든다.
 * @param group 대상의 위반
 * @returns details 요소
 */
function violationGroupBlock(group: ViolationGroup): HTMLDetailsElement {
  const details = collapsible(
    [
      group.kind === 'tokens' ? '토큰 ' : `${KIND_TITLES[group.kind]} · ${group.target} `,
      make('span', 'count', `위반 ${String(group.violations.length)}`),
    ],
    make(
      'ol',
      'violations',
      group.violations.map((violation) => violationItem(violation)),
    ),
  );
  details.classList.add('violation-group');
  details.open = true;
  return details;
}

/**
 * 위반 한 줄(위치, 이유, 고칠 방법, 피그마에서 보기)을 만든다.
 * @param violation 위반
 * @returns 목록 항목
 */
function violationItem(violation: ViolationLine): HTMLLIElement {
  const where = make('div', 'where', [make('span', '', violation.where)]);
  const { nodeId } = violation;
  if (nodeId !== null) {
    const show = make('button', '', '피그마에서 보기');
    show.type = 'button';
    show.addEventListener('click', () => {
      post({ type: 'focus-node', nodeId });
    });
    where.append(show);
  }
  return make('li', '', [
    where,
    make('span', 'reason', violation.reason),
    make('span', 'muted', `고칠 방법: ${violation.fix}`),
  ]);
}

/**
 * 접어 둔 영역을 만든다.
 * @param summary 접힌 줄 내용
 * @param body 펼친 내용
 * @returns details 요소
 */
function collapsible(summary: string | (Node | string)[], body: Node): HTMLDetailsElement {
  const details = document.createElement('details');
  details.append(make('summary', '', summary), make('div', 'body', [body]));
  return details;
}

/**
 * 작은 표시(새로 만듦, 설정 필요 등)를 만든다.
 * @param kind 모양 클래스
 * @param text 글자
 * @returns span 요소
 */
function badge(kind: string, text: string): HTMLSpanElement {
  return make('span', `badge ${kind}`.trim(), text);
}

/**
 * 새 창으로 여는 링크를 만든다.
 * @param url 주소
 * @param text 보이는 글자
 * @returns 링크 요소
 */
function link(url: string, text: string): HTMLAnchorElement {
  const anchor = make('a', '', text);
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  return anchor;
}

/**
 * 요소를 만든다.
 * @param tag 태그 이름
 * @param className 클래스(빈 문자열이면 두지 않음)
 * @param content 글자나 자식 노드
 * @returns 만든 요소
 */
function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  content: string | readonly (Node | string)[],
): HTMLElementTagNameMap[K] {
  const created = document.createElement(tag);
  if (className !== '') {
    created.className = className;
  }
  if (typeof content === 'string') {
    created.textContent = content;
  } else {
    created.append(...content);
  }
  return created;
}

/**
 * 빈 진행 상태를 만든다.
 * @returns 진행 상태
 */
function emptyRun(): RunState {
  return {
    isRunning: false,
    progress: null,
    logs: [],
    notices: [],
    outcome: null,
    failure: null,
  };
}

/**
 * 본체에 메시지를 보낸다.
 * @param message 보낼 메시지
 */
function post(message: UiMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * ID로 요소를 찾고 종류를 확인한다.
 * @param id 요소 ID
 * @param type 기대하는 요소 클래스
 * @returns 찾은 요소
 */
function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) {
    throw new Error(`UI 요소 #${id}가 없다.`);
  }
  return found;
}
