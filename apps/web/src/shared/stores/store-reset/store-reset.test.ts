import { describe, expect, it, vi } from 'vitest';

import { registerStoreReset, resetRegisteredStores } from './store-reset';

describe('registerStoreReset', () => {
  it('등록한 초기화 함수를 resetRegisteredStores가 모두 부른다', () => {
    const first = vi.fn();
    const second = vi.fn();
    registerStoreReset(first);
    registerStoreReset(second);
    resetRegisteredStores();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('같은 함수를 두 번 등록해도 한 번만 부른다', () => {
    const reset = vi.fn();
    registerStoreReset(reset);
    registerStoreReset(reset);
    resetRegisteredStores();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
