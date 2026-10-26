import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { usePanelStore } from '@/core/panels/panels';

import { TaskbarLayer } from './taskbar-layer';

/**
 * 창 내용을 그리지 않는다. 이 테스트는 창 미리보기를 열지 않는다.
 * @returns null
 */
function renderNothing(): null {
  return null;
}

/**
 * 빈 창 제목을 돌려준다.
 * @returns 빈 문자열
 */
function getEmptyTitle(): string {
  return '';
}

afterEach(() => {
  usePanelStore.getState().reset();
});

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:열기와 닫기', () => {
  it('Start 버튼을 누르면 Start 메뉴를 열고, 다시 누르면 닫는다', async () => {
    render(<TaskbarLayer renderWindow={renderNothing} getWindowTitle={getEmptyTitle} />);
    const startButton = screen.getByRole('button', { name: '시작' });
    await userEvent.click(startButton);
    expect(usePanelStore.getState().openPanel).toBe('start');
    expect(startButton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(startButton);
    expect(usePanelStore.getState().openPanel).toBeNull();
    expect(startButton).toHaveAttribute('aria-expanded', 'false');
  });
});

// @codocs [[검색:개요]]
describe('검색:개요', () => {
  it('검색칸에 포커스하면 검색 패널을 연다. Start가 열려 있었으면 닫힌다', async () => {
    usePanelStore.getState().toggleStart();
    render(<TaskbarLayer renderWindow={renderNothing} getWindowTitle={getEmptyTitle} />);
    await userEvent.click(screen.getByRole('searchbox', { name: '검색' }));
    expect(usePanelStore.getState().openPanel).toBe('search');
  });
});
