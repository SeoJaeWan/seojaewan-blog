import type { ReactNode } from 'react';

import { WindowFrame } from '@seojaewan/design-system';

import type {
  OpenWindow,
  WindowApp,
  WindowFrameControls,
} from '@/shared/utils/window-rules/window-rules';

/** 스토리 창 제목에 쓰는 앱 이름 */
const storyAppNames: Readonly<Record<WindowApp, string>> = {
  'file-explorer': 'File Explorer',
  chrome: 'Chrome',
};

/**
 * 동작 스토리의 창 제목을 정한다. 앱 등록표(shell)를 쓰지 않는 기능 스토리가 창 층·작업 표시줄에 넘긴다.
 * @param target 열린 창
 * @returns 앱 이름과 창 차례
 */
export function getStoryWindowTitle(target: OpenWindow): string {
  return `${storyAppNames[target.app]} ${String(target.serial)}`;
}

/**
 * 동작 스토리의 앱 창을 그린다. 앱 창 조립은 다른 기능이라 쓰지 않고 빈 `WindowFrame`에 제목만 둔다.
 * @param target 열린 창
 * @param controls 창 층이 넘긴 창 동작 속성
 * @returns WindowFrame
 */
export function renderStoryWindow(target: OpenWindow, controls: WindowFrameControls): ReactNode {
  return <WindowFrame {...controls} appIcon={null} title={getStoryWindowTitle(target)} />;
}

/**
 * 동작 스토리는 창 앱 아이콘을 그리지 않는다.
 * @returns null
 */
export function renderNoStoryWindowIcon(): null {
  return null;
}
