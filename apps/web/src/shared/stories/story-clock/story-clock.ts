/** 스토리의 가짜 시계 */
export type StoryClock = {
  /** 시간을 흘려 그 사이의 타이머를 부른다 */
  tick: (ms: number) => void;
  /** 진짜 타이머로 돌려놓는다 */
  restore: () => void;
};

/** 기다리는 타이머 */
type PendingTimer = {
  /** 타이머 id */
  id: number;
  /** 부를 시각(ms) */
  at: number;
  /** 부를 함수 */
  callback: () => void;
};

/**
 * 스토리 `play`에서 쓰는 가짜 시계를 켠다. 브라우저 스토리는 Storybook 화면에서도 돌아야 하므로 vitest의 가짜 타이머를 쓰지 않는다.
 * 고른 지연의 `setTimeout`만 잡아 두고 나머지는 진짜 타이머로 보낸다. 전부 잡으면 Storybook의 `await`가 끝나지 않는다.
 * 스토리가 그려진 뒤 `play` 안에서 켜고 `finally`에서 끈다.
 * @param delays 잡아 둘 지연(ms)
 * @returns 가짜 시계
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export function installStoryClock(delays: readonly number[]): StoryClock {
  const realSetTimeout = window.setTimeout.bind(window);
  const realClearTimeout = window.clearTimeout.bind(window);
  let now = 0;
  let nextId = 1;
  let timers: readonly PendingTimer[] = [];

  /**
   * 타이머를 등록한다.
   * @param handler 부를 함수
   * @param delay 기다릴 시간(ms)
   * @param args 함수에 넘길 값
   * @returns 타이머 id
   */
  function fakeSetTimeout(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
    if (!delays.includes(delay)) {
      return realSetTimeout(handler, delay, ...args);
    }
    const id = nextId;
    nextId += 1;
    timers = [
      ...timers,
      {
        id,
        at: now + delay,
        callback: () => {
          if (typeof handler === 'function') {
            (handler as (...values: unknown[]) => void)(...args);
          }
        },
      },
    ];
    return id;
  }

  /**
   * 타이머를 취소한다.
   * @param id 타이머 id
   */
  function fakeClearTimeout(id?: number): void {
    realClearTimeout(id);
    timers = timers.filter((timer) => timer.id !== id);
  }

  window.setTimeout = fakeSetTimeout as typeof window.setTimeout;
  window.clearTimeout = fakeClearTimeout as typeof window.clearTimeout;

  return {
    tick(ms) {
      const end = now + ms;
      for (;;) {
        const next = timers.filter((timer) => timer.at <= end).toSorted((a, b) => a.at - b.at)[0];
        if (next === undefined) {
          break;
        }
        now = next.at;
        fakeClearTimeout(next.id);
        next.callback();
      }
      now = end;
    },
    restore() {
      window.setTimeout = realSetTimeout;
      window.clearTimeout = realClearTimeout;
    },
  };
}
