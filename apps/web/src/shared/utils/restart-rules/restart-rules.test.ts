import { describe, expect, it } from 'vitest';

import {
  finishRestartBooting,
  finishRestartCovering,
  finishRestartRevealing,
  finishRestartShowing,
  initialRestartState,
  pageLoadRestartState,
  type RestartState,
  startRestart,
} from './restart-rules';

// @codocs [[다시 시작:순서]]
describe('다시 시작:순서', () => {
  it('덮기, 보여 주기, 드러내기 차례로 넘어가고, 다 덮었을 때 세대가 오른다', () => {
    const covering = startRestart(initialRestartState);
    expect(covering).toEqual({ phase: 'covering', generation: 0 });
    const showing = finishRestartCovering(covering);
    expect(showing).toEqual({ phase: 'showing', generation: 1 });
    const revealing = finishRestartShowing(showing);
    expect(revealing).toEqual({ phase: 'revealing', generation: 1 });
    expect(finishRestartRevealing(revealing)).toEqual({ phase: 'idle', generation: 1 });
  });

  it('다시 시작하는 중에 다시 시작을 누르면 무시한다', () => {
    const showing: RestartState = { phase: 'showing', generation: 1 };
    expect(startRestart(showing)).toBe(showing);
  });

  it('차례가 아닌 알림은 무시한다', () => {
    expect(finishRestartCovering(initialRestartState)).toBe(initialRestartState);
    expect(finishRestartShowing(initialRestartState)).toBe(initialRestartState);
    expect(finishRestartRevealing(initialRestartState)).toBe(initialRestartState);
  });
});

// @codocs [[창 동작:새로고침과 첫 진입]]
describe('창 동작:새로고침과 첫 진입', () => {
  it('처음 불러오면 덮은 채 시작하고, 준비되면 보여 주는 시간 없이 바로 드러내며 세대는 그대로다', () => {
    expect(pageLoadRestartState).toEqual({ phase: 'booting', generation: 0 });
    const revealing = finishRestartBooting(pageLoadRestartState);
    expect(revealing).toEqual({ phase: 'revealing', generation: 0 });
    expect(finishRestartRevealing(revealing)).toEqual({ phase: 'idle', generation: 0 });
  });

  it('처음 불러오는 중이 아니면 준비 알림을 무시하고, 처음 불러오는 중의 다시 시작도 무시한다', () => {
    expect(finishRestartBooting(initialRestartState)).toBe(initialRestartState);
    const showing: RestartState = { phase: 'showing', generation: 1 };
    expect(finishRestartBooting(showing)).toBe(showing);
    expect(startRestart(pageLoadRestartState)).toBe(pageLoadRestartState);
  });
});
