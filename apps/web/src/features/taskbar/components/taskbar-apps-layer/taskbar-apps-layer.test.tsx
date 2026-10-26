import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';

import { TaskbarAppsLayer } from './taskbar-apps-layer';

/**
 * 창 내용 자리에 앱 이름을 그린다. 미리보기 축소 화면에 쓰는 곳이 넘긴 내용이 들어가는지 본다.
 * @param target 열린 창
 * @returns 앱 이름
 */
function renderAppName(target: OpenWindow): string {
  return `창 내용 ${target.app}`;
}

/**
 * 창 제목을 정한다.
 * @param target 열린 창
 * @returns 창 제목
 */
function getTitle(target: OpenWindow): string {
  return `${target.app} 창`;
}

afterEach(() => {
  useWindowStore.getState().reset();
});

// @codocs [[작업 표시줄:앱 버튼]]
describe('작업 표시줄:앱 버튼', () => {
  it('열린 창이 없을 때 앱 버튼을 누르면 그 앱 창을 연다', async () => {
    render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['chrome']);
  });
});

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기', () => {
  it('창이 여러 개일 때 누르면 쓰는 곳이 넘긴 제목과 창 내용으로 미리보기를 띄운다', async () => {
    const workArea = { width: 1920, height: 1032 };
    useWindowStore.getState().open('chrome', workArea);
    useWindowStore.getState().open('chrome', workArea);
    render(<TaskbarAppsLayer renderWindow={renderAppName} getWindowTitle={getTitle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chrome' }));
    expect(screen.getAllByRole('button', { name: 'chrome 창' })).toHaveLength(2);
    expect(screen.getAllByText('창 내용 chrome')).toHaveLength(2);
  });
});
