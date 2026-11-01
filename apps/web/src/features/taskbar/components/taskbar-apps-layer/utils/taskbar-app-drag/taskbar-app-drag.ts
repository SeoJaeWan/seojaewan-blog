// 작업 표시줄 앱 버튼을 끌어 순서를 바꿀 때 놓일 자리를 찾는 규칙이다.

import type { WindowApp } from '@/shared/utils/window-rules/window-rules';

/** 앱 버튼 요소에 다는 속성. 앱 id를 담는다(최소화·복원 모션도 이 속성으로 버튼 자리를 찾는다) */
export const TASKBAR_APP_ATTRIBUTE = 'data-taskbar-app';

/**
 * 앱 버튼들 가운데 화면 자리 아래에 있는 버튼의 앱을 찾는다. 끌어 순서를 바꿀 때 놓일 자리를 정한다.
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param container 앱 버튼들을 담은 요소
 * @param apps 찾을 앱
 * @param x 화면 가로 자리(px)
 * @param y 화면 세로 자리(px)
 * @returns 그 자리의 버튼의 앱. 버튼 위가 아니면 null
 */
export function findTaskbarAppAt(
  container: Element | null,
  apps: readonly WindowApp[],
  x: number,
  y: number,
): WindowApp | null {
  const buttons = container?.querySelectorAll(`[${TASKBAR_APP_ATTRIBUTE}]`) ?? [];
  for (const button of buttons) {
    const rect = button.getBoundingClientRect();
    const isInside = x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
    if (isInside) {
      return apps.find((app) => app === button.getAttribute(TASKBAR_APP_ATTRIBUTE)) ?? null;
    }
  }
  return null;
}
