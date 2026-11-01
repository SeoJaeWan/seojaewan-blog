import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 훅 단위 테스트(renderHook)가 만든 트리를 시험마다 치운다.
afterEach(() => {
  cleanup();
});
