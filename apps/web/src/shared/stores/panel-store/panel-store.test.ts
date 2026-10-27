import { afterEach, describe, expect, it } from 'vitest';

import { useSearchStore } from '@/shared/stores/search-store/search-store';

import { usePanelStore } from './panel-store';

afterEach(() => {
  usePanelStore.getState().reset();
  useSearchStore.getState().clear();
});

// @codocs [[검색:개요]]
describe('검색:개요', () => {
  it('패널을 닫으면 검색어를 지운다', () => {
    usePanelStore.getState().openSearch();
    useSearchStore.getState().setQuery('react');
    usePanelStore.getState().close();
    expect(useSearchStore.getState().query).toBe('');
  });

  it('다른 패널로 바꾸면 검색어를 지운다', () => {
    usePanelStore.getState().openSearch();
    useSearchStore.getState().setQuery('react');
    usePanelStore.getState().toggleStart();
    expect(useSearchStore.getState().query).toBe('');
  });

  it('이미 열린 검색 패널을 다시 열어도 검색어를 지우지 않는다', () => {
    usePanelStore.getState().openSearch();
    useSearchStore.getState().setQuery('react');
    usePanelStore.getState().openSearch();
    expect(useSearchStore.getState().query).toBe('react');
  });
});
