import type { ComponentSummary, MainMessage, UiMessage } from '../messages';

// 플러그인 UI. 토큰 입력, 컴포넌트 선택, 진행 로그와 PR 링크를 보여 준다.

const tokenInput = element('token', HTMLInputElement);
const branchInput = element('branch', HTMLInputElement);
const selectAll = element('select-all', HTMLInputElement);
const componentList = element('components', HTMLDivElement);
const tokensCheckbox = element('tokens', HTMLInputElement);
const exportButton = element('export', HTMLButtonElement);
const result = element('result', HTMLParagraphElement);
const logArea = element('log', HTMLDivElement);

window.addEventListener('message', handleWindowMessage);
selectAll.addEventListener('change', handleSelectAllChange);
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
  for (const checkbox of componentCheckboxes()) {
    checkbox.checked = selectAll.checked;
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
      branchInput.value = message.branch;
      renderComponents(message.components);
      exportButton.disabled = false;
      break;
    case 'log':
      appendLog(message.text);
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
 * 내보내기 결과(커밋, PR 링크)를 보여 준다.
 * @param outcome 커밋 결과, 바뀐 것 없음, 또는 위반 목록
 */
function showResult(outcome: Extract<MainMessage, { type: 'done' }>['result']): void {
  if (outcome.kind === 'unchanged') {
    result.textContent = '바뀐 것이 없어 커밋하지 않았다.';
    return;
  }
  if (outcome.kind === 'blocked') {
    showViolations(outcome.violations);
    return;
  }
  const done = outcome.commit;
  const parts: (string | Node)[] = [`${done.branch}: `, link(done.commitUrl, '커밋')];
  if (done.pullRequestUrl !== null) {
    parts.push(done.isNewPullRequest ? ' · 새 PR: ' : ' · 열린 PR: ', link(done.pullRequestUrl));
  } else if (!done.isNewPullRequest) {
    parts.push(' · 이 브랜치에 열린 PR이 없다');
  }
  result.replaceChildren(...parts);
  appendLog('완료');
}

/**
 * 구조 검사 위반을 레이어 경로·이유·고칠 방법 목록으로 보여 준다. 위반이 있으면 커밋하지 않는다.
 * @codocs [[피그마 일치 검사:구조 검사]]
 * @param violations 위반 목록
 */
function showViolations(
  violations: Extract<
    Extract<MainMessage, { type: 'done' }>['result'],
    { kind: 'blocked' }
  >['violations'],
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
 * 고른 컴포넌트로 내보내기를 요청한다.
 */
function handleExportClick(): void {
  const componentIds = componentCheckboxes()
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  if (componentIds.length === 0 && !tokensCheckbox.checked) {
    appendLog('내보낼 컴포넌트나 토큰을 고른다.');
    return;
  }
  exportButton.disabled = true;
  result.textContent = '';
  logArea.textContent = '';
  const message: UiMessage = {
    type: 'export',
    token: tokenInput.value,
    componentIds,
    shouldExportTokens: tokensCheckbox.checked,
    branch: branchInput.value,
  };
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * 컴포넌트 체크박스 목록을 그린다.
 * @param components 컴포넌트 목록
 */
function renderComponents(components: readonly ComponentSummary[]): void {
  componentList.classList.remove('muted');
  componentList.replaceChildren(...components.map(componentLabel));
}

/**
 * 컴포넌트 하나의 체크박스와 이름을 만든다.
 * @param component 컴포넌트
 * @returns 체크박스를 담은 label
 */
function componentLabel(component: ComponentSummary): HTMLLabelElement {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = component.id;
  checkbox.addEventListener('change', handleComponentChange);
  const label = document.createElement('label');
  const detail = component.kind === 'COMPONENT_SET' ? `변형 ${component.variantCount}개` : '단독';
  label.append(checkbox, ` ${component.name} `, muted(`(${detail})`));
  return label;
}

/**
 * 컴포넌트를 하나라도 끄면 "모두 선택"을 끈다.
 */
function handleComponentChange(): void {
  selectAll.checked = componentCheckboxes().every((checkbox) => checkbox.checked);
}

/**
 * 컴포넌트 체크박스를 모두 찾는다.
 * @returns 체크박스 목록
 */
function componentCheckboxes(): HTMLInputElement[] {
  return Array.from(componentList.querySelectorAll('input[type="checkbox"]'));
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
