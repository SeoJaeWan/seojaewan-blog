import { isMotionApiAvailable, listMotionSamples } from './core/read-motion';
import { runExport } from './export-flow';
import { listComponents, listPatterns } from './figma-reader';
import type { MainMessage, UiMessage } from './messages';
import { TOKEN_STORAGE_KEY } from './plugin-config';

// 플러그인 본체 진입점. UI를 띄우고 메시지를 받아 내보내기를 실행한다.

figma.showUI(__html__, { width: 420, height: 600, themeColors: true });
figma.ui.on('message', handleMessage);
start().catch(reportFailure);

// 모션 API를 쓸 수 없는 계정에서 보여 주는 안내다.
const MOTION_UNAVAILABLE_TEXT =
  '이 계정은 피그마 모션 API를 쓸 수 없어 애니메이션을 내보낼 수 없다. 나머지 대상은 내보낼 수 있다.';

/**
 * 저장한 토큰과 컴포넌트·조립·애니메이션 견본 목록을 UI에 보낸다.
 * 모션 API를 쓸 수 없는 계정이면 애니메이션 목록 대신 안내를 보낸다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 */
async function start(): Promise<void> {
  const stored: unknown = await figma.clientStorage.getAsync(TOKEN_STORAGE_KEY);
  const components = await listComponents();
  const patterns = await listPatterns();
  const motions = await listMotionSamples();
  const [first] = motions;
  const isAvailable = first === undefined || (await isMotionApiAvailable(first.id));
  post({
    type: 'init',
    token: typeof stored === 'string' ? stored : '',
    components,
    patterns,
    motions: isAvailable ? motions : [],
    motionUnavailable: isAvailable ? null : MOTION_UNAVAILABLE_TEXT,
  });
}

/**
 * UI 메시지를 받아 내보내기를 실행한다.
 * @param message UI가 보낸 메시지
 */
function handleMessage(message: unknown): void {
  if (!isExportMessage(message)) {
    return;
  }
  exportFromUi(message).catch(reportFailure);
}

/**
 * 토큰을 저장하고 내보내기를 실행한 뒤 결과를 UI에 알린다.
 * @param message 내보내기 요청
 */
async function exportFromUi(message: UiMessage): Promise<void> {
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
  });
  post({ type: 'done', result });
}

/**
 * 실패를 UI에 알린다. 메시지에는 토큰을 넣지 않는다.
 * @param error 실패 원인
 */
function reportFailure(error: unknown): void {
  post({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
}

/**
 * UI에 메시지를 보낸다.
 * @param message 보낼 메시지
 */
function post(message: MainMessage): void {
  figma.ui.postMessage(message);
}

/**
 * UI 메시지가 내보내기 요청 모양인지 확인한다.
 * @param message UI가 보낸 값
 * @returns 내보내기 요청이면 true
 */
function isExportMessage(message: unknown): message is UiMessage {
  if (message === null || typeof message !== 'object') {
    return false;
  }
  const type: unknown = Reflect.get(message, 'type');
  const token: unknown = Reflect.get(message, 'token');
  const tokens: unknown = Reflect.get(message, 'tokens');
  const componentIds: unknown = Reflect.get(message, 'componentIds');
  const patternIds: unknown = Reflect.get(message, 'patternIds');
  const motionIds: unknown = Reflect.get(message, 'motionIds');
  return (
    type === 'export' &&
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
