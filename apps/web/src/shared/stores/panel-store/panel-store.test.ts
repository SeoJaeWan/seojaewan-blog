import { afterEach, describe, expect, it } from 'vitest';

import { useSearchStore } from '@/shared/stores/search-store/search-store';

import { usePanelStore } from './panel-store';

afterEach(() => {
  usePanelStore.getState().reset();
  useSearchStore.getState().clearAll();
});

// @codocs [[검색:입력칸]]
describe('검색:입력칸', () => {
  it('검색 패널을 닫으면 검색 패널의 검색어를 지운다', () => {
    usePanelStore.getState().openSearch();
    useSearchStore.getState().setQuery('search', 'react');
    usePanelStore.getState().close();
    expect(useSearchStore.getState().panels.search.query).toBe('');
  });

  it('Start를 닫으면 Start의 검색어를 지운다', () => {
    usePanelStore.getState().toggleStart();
    useSearchStore.getState().setQuery('start', 'react');
    usePanelStore.getState().toggleStart();
    expect(useSearchStore.getState().panels.start.query).toBe('');
  });

  it('다른 패널로 바꾸면 닫힌 패널의 검색어를 지운다', () => {
    usePanelStore.getState().openSearch();
    useSearchStore.getState().setQuery('search', 'react');
    usePanelStore.getState().toggleStart();
    expect(useSearchStore.getState().panels.search.query).toBe('');
  });

  it('이미 열린 검색 패널을 다시 열어도 검색어를 지우지 않는다', () => {
    usePanelStore.getState().openSearch();
    useSearchStore.getState().setQuery('search', 'react');
    usePanelStore.getState().openSearch();
    expect(useSearchStore.getState().panels.search.query).toBe('react');
  });
});
