import { afterEach, describe, expect, it } from 'vitest';

import { resetRegisteredStores } from '@/shared/stores/store-reset/store-reset';

import { useSearchStore } from './search-store';

afterEach(() => {
  useSearchStore.getState().clear();
});

// @codocs [[검색:개요]]
describe('검색:개요', () => {
  it('검색어를 바꾸면 고른 항목이 최고 일치로 돌아간다', () => {
    useSearchStore.getState().setQuery('react');
    useSearchStore.getState().moveSelection(1, 3);
    useSearchStore.getState().setQuery('reac');
    expect(useSearchStore.getState().selectedIndex).toBe(0);
  });

  it('검색어를 지우면 고른 항목도 처음으로 돌아간다', () => {
    useSearchStore.getState().setQuery('react');
    useSearchStore.getState().moveSelection(1, 3);
    useSearchStore.getState().clear();
    expect(useSearchStore.getState()).toMatchObject({ query: '', selectedIndex: 0 });
  });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('다시 시작하면 검색어를 지운다', () => {
    useSearchStore.getState().setQuery('react');
    resetRegisteredStores();
    expect(useSearchStore.getState().query).toBe('');
  });
});
