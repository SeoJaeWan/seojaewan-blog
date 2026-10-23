import type {
  ComponentSummary,
  ExportOutcome,
  MainMessage,
  PullRequestCommit,
  UiMessage,
} from '../messages';

// 플러그인 UI. 토큰 입력, 컴포넌트·조립 선택, 진행 로그와 PR 링크를 보여 준다.

const tokenInput = element('token', HTMLInputElement);
const selectAll = element('select-all', HTMLInputElement);
const componentList = element('components', HTMLDivElement);
const selectAllPatterns = element('select-all-patterns', HTMLInputElement);
const patternList = element('patterns', HTMLDivElement);
const exportButton = element('export', HTMLButtonElement);
const result = element('result', HTMLParagraphElement);
const noticesBox = element('notices', HTMLDivElement);
const logArea = element('log', HTMLDivElement);

window.addEventListener('message', handleWindowMessage);
selectAll.addEventListener('change', handleSelectAllChange);
selectAllPatterns.addEventListener('change', handleSelectAllPatternsChange);
exportButton.addEventListener('click', handleExportClick);

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
 * "모두 선택"에 맞춰 컴포넌트 체크박스를 모두 켜거나 끈다.
 */
function handleSelectAllChange(): void {
  for (const checkbox of checkboxes(componentList)) {
    checkbox.checked = selectAll.checked;
  }
}

/**
 * 조립 "모두 선택"에 맞춰 조립 체크박스를 모두 켜거나 끈다.
 */
function handleSelectAllPatternsChange(): void {
  for (const checkbox of checkboxes(patternList)) {
    checkbox.checked = selectAllPatterns.checked;
  }
}

/**
 * 플러그인 본체 메시지에 따라 화면을 바꾼다.
 * @param message 본체가 보낸 메시지
 */
function handleMainMessage(message: MainMessage): void {
  switch (message.type) {
    case 'init':
      tokenInput.value = message.token;
      renderList(componentList, message.components);
      renderList(patternList, message.patterns);
      exportButton.disabled = false;
      break;
    case 'log':
      appendLog(message.text);
      break;
    case 'notices':
      showNotices(message.notices);
      break;
    case 'done':
      exportButton.disabled = false;
      showResult(message.result);
      break;
    case 'failed':
      exportButton.disabled = false;
      appendLog(`실패: ${message.message}`);
      break;
  }
}

/**
 * 내보내기 결과(PR마다 커밋과 PR 링크)를 보여 준다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param outcome PR별 커밋 결과, 또는 위반 목록
 */
function showResult(outcome: ExportOutcome): void {
  if (outcome.kind === 'blocked') {
    showViolations(outcome.violations);
    return;
  }
  const list = document.createElement('ul');
  for (const commit of outcome.commits) {
    list.append(commitItem(commit));
  }
  const unchanged =
    outcome.unchanged.length === 0
      ? []
      : [muted(`바뀐 것이 없어 커밋하지 않음: ${outcome.unchanged.join(', ')}`)];
  if (outcome.commits.length === 0) {
    result.replaceChildren('바뀐 것이 없어 커밋하지 않았다.');
  } else {
    result.replaceChildren(
      `PR ${String(outcome.commits.length)}개에 커밋했다.`,
      list,
      ...unchanged,
    );
  }
  appendLog('완료');
}

/**
 * PR 하나의 커밋 결과 줄을 만든다.
 * @param commit 커밋 결과
 * @returns 목록 항목
 */
function commitItem(commit: PullRequestCommit): HTMLLIElement {
  const item = document.createElement('li');
  item.append(
    `${commit.target} (${commit.branch}): `,
    link(commit.commitUrl, '커밋'),
    commit.isNewPullRequest ? ' · 새 PR: ' : ' · 열린 PR: ',
    link(commit.pullRequestUrl),
  );
  return item;
}

/**
 * 쓰는 곳이 없는 변수·스타일 알림을 보여 준다. 정리 알림이라 내보내기를 막지 않는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param notices 알림 문장
 */
function showNotices(notices: readonly string[]): void {
  if (notices.length === 0) {
    noticesBox.replaceChildren();
    return;
  }
  const list = document.createElement('ul');
  for (const notice of notices) {
    const item = document.createElement('li');
    item.textContent = notice;
    list.append(item);
  }
  noticesBox.replaceChildren(
    muted(`정리 알림 ${String(notices.length)}개(막지 않음): 쓰는 곳이 없으면 지울지 확인한다.`),
    list,
  );
}

/**
 * 구조 검사 위반을 레이어 경로·이유·고칠 방법 목록으로 한 번에 보여 준다. 위반이 있으면 커밋하지 않는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param violations 위반 목록
 */
function showViolations(
  violations: Extract<ExportOutcome, { kind: 'blocked' }>['violations'],
): void {
  const list = document.createElement('ol');
  list.className = 'violations';
  for (const violation of violations) {
    const item = document.createElement('li');
    const where = document.createElement('strong');
    where.textContent = violation.where;
    item.append(
      where,
      document.createElement('br'),
      violation.reason,
      document.createElement('br'),
      muted(`고칠 방법: ${violation.fix}`),
    );
    list.append(item);
  }
  result.replaceChildren(
    `구조 검사 위반 ${String(violations.length)}개. 고친 뒤 다시 내보낸다(커밋하지 않았다).`,
    list,
  );
  appendLog('구조 검사 위반으로 커밋하지 않음');
}

/**
 * 고른 컴포넌트와 조립으로 내보내기를 요청한다. 토큰은 고르지 않아도 늘 읽어 main과 비교한다.
 */
function handleExportClick(): void {
  exportButton.disabled = true;
  result.textContent = '';
  logArea.textContent = '';
  const message: UiMessage = {
    type: 'export',
    token: tokenInput.value,
    componentIds: checkedIds(componentList),
    patternIds: checkedIds(patternList),
  };
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * 목록에서 켠 체크박스의 노드 ID를 모은다.
 * @param list 체크박스 목록
 * @returns 노드 ID
 */
function checkedIds(list: HTMLDivElement): string[] {
  return checkboxes(list)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
}

/**
 * 컴포넌트나 조립 체크박스 목록을 그린다.
 * @param list 그릴 곳
 * @param items 컴포넌트나 조립 목록
 */
function renderList(list: HTMLDivElement, items: readonly ComponentSummary[]): void {
  list.classList.remove('muted');
  list.replaceChildren(...items.map(itemLabel));
}

/**
 * 컴포넌트나 조립 하나의 체크박스와 이름을 만든다.
 * @param item 컴포넌트나 조립
 * @returns 체크박스를 담은 label
 */
function itemLabel(item: ComponentSummary): HTMLLabelElement {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = item.id;
  checkbox.addEventListener('change', handleItemChange);
  const label = document.createElement('label');
  const detail = item.kind === 'COMPONENT_SET' ? `변형 ${item.variantCount}개` : '단독';
  label.append(checkbox, ` ${item.name} `, muted(`(${detail})`));
  return label;
}

/**
 * 항목을 하나라도 끄면 그 목록의 "모두 선택"을 끈다.
 */
function handleItemChange(): void {
  selectAll.checked = checkboxes(componentList).every((checkbox) => checkbox.checked);
  selectAllPatterns.checked = checkboxes(patternList).every((checkbox) => checkbox.checked);
}

/**
 * 목록의 체크박스를 모두 찾는다.
 * @param list 체크박스 목록
 * @returns 체크박스 목록
 */
function checkboxes(list: HTMLDivElement): HTMLInputElement[] {
  return Array.from(list.querySelectorAll('input[type="checkbox"]'));
}

/**
 * 로그 영역에 한 줄을 더한다.
 * @param text 로그 내용
 */
function appendLog(text: string): void {
  logArea.textContent = `${logArea.textContent}${text}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

/**
 * 새 창으로 여는 링크를 만든다.
 * @param url 주소
 * @param text 보이는 글자. 없으면 주소
 * @returns 링크 요소
 */
function link(url: string, text: string = url): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noreferrer';
  anchor.textContent = text;
  return anchor;
}

/**
 * 흐린 글자를 만든다.
 * @param text 내용
 * @returns span 요소
 */
function muted(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'muted';
  span.textContent = text;
  return span;
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
