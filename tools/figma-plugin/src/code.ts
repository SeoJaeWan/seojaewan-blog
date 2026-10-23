import { runExport } from './export-flow';
import { listComponents } from './figma-reader';
import type { MainMessage, UiMessage } from './messages';
import { TOKEN_STORAGE_KEY } from './plugin-config';

// 플러그인 본체 진입점. UI를 띄우고 메시지를 받아 내보내기를 실행한다.

figma.showUI(__html__, { width: 420, height: 600, themeColors: true });
figma.ui.on('message', handleMessage);
start().catch(reportFailure);

/**
 * 저장한 토큰과 컴포넌트 목록을 UI에 보낸다.
 */
async function start(): Promise<void> {
  const stored: unknown = await figma.clientStorage.getAsync(TOKEN_STORAGE_KEY);
  const components = await listComponents();
  post({ type: 'init', token: typeof stored === 'string' ? stored : '', components });
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
  await figma.clientStorage.setAsync(TOKEN_STORAGE_KEY, token);
  const result = await runExport({
    token,
    componentIds: message.componentIds,
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
  const ids: unknown = Reflect.get(message, 'componentIds');
  return (
    type === 'export' &&
    typeof token === 'string' &&
    Array.isArray(ids) &&
    ids.every((id) => typeof id === 'string')
  );
}
