import { describe, expect, it } from 'vitest';

import {
  finishRestartCovering,
  finishRestartRevealing,
  finishRestartShowing,
  initialRestartState,
  type RestartState,
  startRestart,
} from './restart-rules';

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
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
