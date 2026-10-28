import { tokensJsonText } from './core/export-tokens';
import { isMotionApiAvailable, listMotionSamples } from './core/read-motion';
import { runExport } from './export-flow';
import { listComponents, listPatterns, sortByCanvasOrder } from './figma-reader';
import { getBranchHead, getFileText, listTreeFiles, readRepository } from './github-client';
import type {
  ComponentSummary,
  ExportMessage,
  MainMessage,
  MotionSummary,
  RepoStatus,
  UiMessage,
} from './messages';
import {
  BASE_BRANCH,
  COMPONENTS_DIR,
  FILE_KEY,
  MOTIONS_DIR,
  PATTERNS_DIR,
  REPO_NAME,
  REPO_OWNER,
  TOKEN_STORAGE_KEY,
  TOKENS_PATH,
} from './plugin-config';
import { newTargetIds } from './target-status';
import { tokenChanges, tokenSummary } from './token-changes';

// 플러그인 본체 진입점. UI를 띄우고 메시지를 받아 내보내기·저장소 비교·연결 확인·노드 보기를 실행한다.

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });
figma.ui.on('message', handleMessage);

// 모션 API를 쓸 수 없는 계정에서 보여 주는 안내다.
const MOTION_UNAVAILABLE_TEXT =
  '이 계정은 피그마 모션 API를 쓸 수 없어 애니메이션을 내보낼 수 없다. 나머지 대상은 내보낼 수 있다.';
// 설정 화면에 링크로 두는 PR 규칙 문서
const RULES_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${BASE_BRANCH}/.codocs/design-system/figma-sync.yaml`;
// GitHub fine-grained 토큰 만들기 화면
const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

/** 열 때 읽은 목록. 저장소 비교에 다시 쓴다 */
type Catalog = {
  components: ComponentSummary[];
  patterns: ComponentSummary[];
  motions: MotionSummary[];
};

let catalog: Catalog = { components: [], patterns: [], motions: [] };

start().catch(reportFailure);

/**
 * 저장한 토큰과 컴포넌트·조립·애니메이션 견본 목록을 UI에 보내고, 토큰이 있으면 저장소와 비교한다.
 * 모션 API를 쓸 수 없는 계정이면 애니메이션 목록 대신 안내를 보낸다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[피그마 연동:플러그인 화면]]
 */
async function start(): Promise<void> {
  const stored: unknown = await figma.clientStorage.getAsync(TOKEN_STORAGE_KEY);
  const token = typeof stored === 'string' ? stored : '';
  const components = await listComponents();
  const patterns = await listPatterns();
  const motions = await sortByCanvasOrder(await listMotionSamples());
  const [first] = motions;
  const isAvailable = first === undefined || (await isMotionApiAvailable(first.id));
  catalog = { components, patterns, motions: isAvailable ? motions : [] };
  post({
    type: 'init',
    token,
    settings: {
      repo: `${REPO_OWNER}/${REPO_NAME}`,
      fileKey: FILE_KEY,
      rulesUrl: RULES_URL,
      newTokenUrl: NEW_TOKEN_URL,
    },
    components,
    patterns,
    motions: catalog.motions,
    motionUnavailable: isAvailable ? null : MOTION_UNAVAILABLE_TEXT,
  });
  await refreshStatus(token);
}

/**
 * UI 메시지를 종류에 따라 처리한다.
 * @param message UI가 보낸 메시지
 */
function handleMessage(message: unknown): void {
  if (!isUiMessage(message)) {
    return;
  }
  switch (message.type) {
    case 'export':
      exportFromUi(message).catch(reportFailure);
      break;
    case 'save-token':
      saveToken(message.token).catch(reportFailure);
      break;
    case 'check-connection':
      checkConnection(message.token).catch(reportFailure);
      break;
    case 'refresh-status':
      refreshStatus(message.token).catch(reportFailure);
      break;
    case 'focus-node':
      focusNode(message.nodeId).catch(reportFailure);
      break;
  }
}

/**
 * 토큰을 플러그인 로컬 저장소에 저장한다. 빈 문자열이면 지운다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param token GitHub 토큰
 */
async function saveToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed === '') {
    await figma.clientStorage.deleteAsync(TOKEN_STORAGE_KEY);
    post({ type: 'repo-status', status: { kind: 'missing-token' } });
    return;
  }
  await figma.clientStorage.setAsync(TOKEN_STORAGE_KEY, trimmed);
}

/**
 * 저장소를 읽어 연결과 쓰기 권한을 UI에 알린다. 실패 이유도 그대로 보인다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param token GitHub 토큰
 */
async function checkConnection(token: string): Promise<void> {
  try {
    const repository = await readRepository(token.trim());
    post({
      type: 'connection',
      result: { ok: true, repo: repository.fullName, canPush: repository.canPush },
    });
  } catch (error) {
    post({ type: 'connection', result: { ok: false, message: errorText(error) } });
  }
}

/**
 * `main`과 비교해 토큰 변경 개수와 새로 만드는 대상을 UI에 알린다.
 * 트리를 한 번 읽어 대상 폴더가 있는지 보고, tokens.json은 한 번만 받는다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param token GitHub 토큰
 */
async function refreshStatus(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed === '') {
    post({ type: 'repo-status', status: { kind: 'missing-token' } });
    return;
  }
  post({ type: 'repo-status', status: { kind: 'loading' } });
  let status: RepoStatus;
  try {
    const head = await getBranchHead(trimmed, BASE_BRANCH);
    const files = await listTreeFiles(trimmed, head.treeSha, [
      `${COMPONENTS_DIR}/`,
      `${PATTERNS_DIR}/`,
      `${MOTIONS_DIR}/`,
    ]);
    const newIds = newTargetIds(files.keys(), catalog);
    const mainTokens = await getFileText(trimmed, TOKENS_PATH, head.commitSha);
    try {
      const summary = tokenSummary(tokenChanges(mainTokens, await tokensJsonText()));
      status = { kind: 'ready', tokens: summary, tokensError: null, newIds };
    } catch (error) {
      status = { kind: 'ready', tokens: null, tokensError: errorText(error), newIds };
    }
  } catch (error) {
    status = { kind: 'error', message: errorText(error) };
  }
  post({ type: 'repo-status', status });
}

/**
 * 노드의 페이지로 옮겨 그 노드를 선택하고 화면에 맞춘다. 위반 줄의 "피그마에서 보기"가 쓴다.
 * 동적 페이지 불러오기(`documentAccess: dynamic-page`)에서는 `figma.currentPage`에 바로 대입할 수 없어
 * `setCurrentPageAsync`로 바꾼다.
 * @codocs [[피그마 연동:플러그인 화면]]
 * @param nodeId 노드 ID
 */
async function focusNode(nodeId: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (node === null || node.type === 'DOCUMENT' || node.type === 'PAGE') {
    figma.notify('레이어를 찾지 못했다. 지워졌거나 이름이 바뀌었을 수 있다.');
    return;
  }
  let page: BaseNode | null = node.parent;
  while (page !== null && page.type !== 'PAGE') {
    page = page.parent;
  }
  if (page === null) {
    return;
  }
  if (figma.currentPage.id !== page.id) {
    await figma.setCurrentPageAsync(page);
  }
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
}

/**
 * 토큰을 저장하고 내보내기를 실행한 뒤 결과를 UI에 알린다.
 * @param message 내보내기 요청
 */
async function exportFromUi(message: ExportMessage): Promise<void> {
  const token = message.token.trim();
  if (token === '') {
    throw new Error('GitHub 토큰을 입력해야 한다.');
  }
  const hasTarget =
    message.tokens ||
    message.componentIds.length > 0 ||
    message.patternIds.length > 0 ||
    message.motionIds.length > 0;
  if (!hasTarget) {
    throw new Error('내보낼 대상(토큰, 컴포넌트, 조립, 애니메이션)을 하나 이상 고른다.');
  }
  await figma.clientStorage.setAsync(TOKEN_STORAGE_KEY, token);
  const result = await runExport({
    token,
    componentIds: message.componentIds,
    patternIds: message.patternIds,
    motionIds: message.motionIds,
    log: (text) => {
      post({ type: 'log', text });
    },
    notify: (notices) => {
      post({ type: 'notices', notices });
    },
    progress: (progress) => {
      post({ type: 'progress', progress });
    },
  });
  post({ type: 'done', result });
}

/**
 * 실패를 UI에 알린다. 메시지에는 토큰을 넣지 않는다.
 * @param error 실패 원인
 */
function reportFailure(error: unknown): void {
  post({ type: 'failed', message: errorText(error) });
}

/**
 * 오류를 사람이 읽는 문장으로 바꾼다.
 * @param error 오류
 * @returns 오류 문장
 */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * UI에 메시지를 보낸다.
 * @param message 보낼 메시지
 */
function post(message: MainMessage): void {
  figma.ui.postMessage(message);
}

/**
 * UI 메시지 모양을 확인한다.
 * @param message UI가 보낸 값
 * @returns 알맞은 모양이면 true
 */
function isUiMessage(message: unknown): message is UiMessage {
  if (message === null || typeof message !== 'object') {
    return false;
  }
  const type: unknown = Reflect.get(message, 'type');
  switch (type) {
    case 'export':
      return isExportMessage(message);
    case 'save-token':
    case 'check-connection':
    case 'refresh-status':
      return typeof Reflect.get(message, 'token') === 'string';
    case 'focus-node':
      return typeof Reflect.get(message, 'nodeId') === 'string';
    default:
      return false;
  }
}

/**
 * UI 메시지가 내보내기 요청 모양인지 확인한다.
 * @param message UI가 보낸 값
 * @returns 내보내기 요청이면 true
 */
function isExportMessage(message: object): boolean {
  const token: unknown = Reflect.get(message, 'token');
  const tokens: unknown = Reflect.get(message, 'tokens');
  const componentIds: unknown = Reflect.get(message, 'componentIds');
  const patternIds: unknown = Reflect.get(message, 'patternIds');
  const motionIds: unknown = Reflect.get(message, 'motionIds');
  return (
    typeof token === 'string' &&
    typeof tokens === 'boolean' &&
    isIdList(componentIds) &&
    isIdList(patternIds) &&
    isIdList(motionIds)
  );
}

/**
 * 값이 노드 ID 목록인지 확인한다.
 * @param value 확인할 값
 * @returns 문자열 배열이면 true
 */
function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string');
}
