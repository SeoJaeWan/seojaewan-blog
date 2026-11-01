// 작업 표시줄이 그릴 앱 버튼을 정하는 규칙을 React 밖의 순수 함수로 둔다.

import type { WindowApp, WindowState } from '@/shared/utils/window-rules/window-rules';

/**
 * 작업 표시줄에 그릴 앱을 차례대로 정한다. 고정한 앱을 고정 순서대로 먼저 그리고, 고정하지 않았지만 창이 열린 앱을
 * 그 뒤에 처음 연 창의 순서대로 붙인다. 고정을 해제한 앱은 창을 모두 닫으면 목록에서 빠진다.
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param pins 고정한 앱(고정 순서)
 * @param state 창 저장소 상태
 * @returns 그릴 앱
 */
export function getTaskbarApps(pins: readonly WindowApp[], state: WindowState): WindowApp[] {
  const running = Object.values(state.windows)
    .toSorted((left, right) => left.serial - right.serial)
    .map((window) => window.app);
  const extras = [...new Set(running)].filter((app) => !pins.includes(app));
  return [...pins, ...extras];
}
