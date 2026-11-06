import { describe, expect, it } from 'vitest';

import { runnerPort } from './runner-port.mjs';

// @codocs [[배포 환경:CI]]
describe('runnerPort', () => {
  it('runner 이름 끝 번호를 기준 포트에 더한다', () => {
    expect(runnerPort('minipc-1', 4100)).toBe(4101);
    expect(runnerPort('minipc-2', 4100)).toBe(4102);
    expect(runnerPort('minipc-3', 4100)).toBe(4103);
  });

  it('번호가 없는 이름은 실패한다', () => {
    expect(() => runnerPort('minipc', 4100)).toThrow('번호');
    expect(() => runnerPort('', 4100)).toThrow('번호');
  });

  it('블로그 컨테이너 자리(3000)는 쓰지 않는다', () => {
    expect(() => runnerPort('minipc-1', 2999)).toThrow('3000');
  });
});
