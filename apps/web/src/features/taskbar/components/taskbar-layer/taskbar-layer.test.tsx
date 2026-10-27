import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useSearchStore } from '@/shared/stores/search-store/search-store';

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
  useSearchStore.getState().clear();
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

  it('검색칸에 입력한 글자가 검색어가 된다', async () => {
    render(<TaskbarLayer renderWindow={renderNothing} getWindowTitle={getEmptyTitle} />);
    const searchBox = screen.getByRole('searchbox', { name: '검색' });
    await userEvent.type(searchBox, '리액트');
    expect(useSearchStore.getState().query).toBe('리액트');
    expect(searchBox).toHaveValue('리액트');
  });

  /**
   * 검색 패널을 연 채 검색칸에 포커스한 뒤 Esc처럼 패널만 닫고 한 글자를 이어서 입력한다.
   * @returns 검색칸
   */
  async function typeAfterClosingPanel(): Promise<HTMLElement> {
    usePanelStore.getState().openSearch();
    render(<TaskbarLayer renderWindow={renderNothing} getWindowTitle={getEmptyTitle} />);
    const searchBox = screen.getByRole('searchbox', { name: '검색' });
    searchBox.focus();
    act(() => {
      usePanelStore.getState().close();
    });
    await userEvent.keyboard('가');
    return searchBox;
  }

  it('Esc로 검색 패널을 닫은 뒤 이어서 입력하면 검색 패널이 다시 열린다', async () => {
    await typeAfterClosingPanel();
    expect(usePanelStore.getState().openPanel).toBe('search');
  });

  it('Esc로 검색 패널을 닫은 뒤 이어서 입력한 글자는 검색칸에 남는다', async () => {
    const searchBox = await typeAfterClosingPanel();
    expect(searchBox).toHaveValue('가');
  });

  it('Start가 열려 있으면 작업 표시줄 검색칸은 비어 있다', () => {
    usePanelStore.getState().toggleStart();
    useSearchStore.getState().setQuery('리액트');
    render(<TaskbarLayer renderWindow={renderNothing} getWindowTitle={getEmptyTitle} />);
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('');
  });
});
