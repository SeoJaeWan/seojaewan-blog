import { afterEach, describe, expect, it } from 'vitest';

import { resetRegisteredStores } from '@/shared/stores/store-reset/store-reset';

import { useSearchStore } from './search-store';

afterEach(() => {
  useSearchStore.getState().clearAll();
});

// @codocs [[검색:입력칸]]
describe('검색:입력칸', () => {
  it('Start 검색어와 검색 패널 검색어는 따로다', () => {
    useSearchStore.getState().setQuery('start', 'react');
    expect(useSearchStore.getState().panels.search.query).toBe('');
    useSearchStore.getState().setQuery('search', 'next');
    expect(useSearchStore.getState().panels.start.query).toBe('react');
  });

  it('한 패널의 검색어를 지워도 다른 패널의 검색어는 남는다', () => {
    useSearchStore.getState().setQuery('start', 'react');
    useSearchStore.getState().setQuery('search', 'next');
    useSearchStore.getState().clear('search');
    expect(useSearchStore.getState().panels).toEqual({
      start: { query: 'react', selectedIndex: 0 },
      search: { query: '', selectedIndex: 0 },
    });
  });
});

// @codocs [[검색:결과 화면]]
describe('검색:결과 화면', () => {
  it('검색어를 바꾸면 고른 항목이 최고 일치로 돌아간다', () => {
    useSearchStore.getState().setQuery('search', 'react');
    useSearchStore.getState().moveSelection('search', 1, 3);
    useSearchStore.getState().setQuery('search', 'reac');
    expect(useSearchStore.getState().panels.search.selectedIndex).toBe(0);
  });

  it('검색어를 지우면 고른 항목도 처음으로 돌아간다', () => {
    useSearchStore.getState().setQuery('start', 'react');
    useSearchStore.getState().moveSelection('start', 1, 3);
    useSearchStore.getState().clear('start');
    expect(useSearchStore.getState().panels.start).toEqual({ query: '', selectedIndex: 0 });
  });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('다시 시작하면 두 검색어를 모두 지운다', () => {
    useSearchStore.getState().setQuery('start', 'react');
    useSearchStore.getState().setQuery('search', 'next');
    resetRegisteredStores();
    expect(useSearchStore.getState().panels.start.query).toBe('');
    expect(useSearchStore.getState().panels.search.query).toBe('');
  });
});
