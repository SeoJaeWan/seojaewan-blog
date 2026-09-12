import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  formatTaskbarTimestamp,
  getMillisecondsUntilNextMinute,
  startTaskbarTimestampScheduler,
  type TaskbarTimestampClock,
  type TaskbarTimestampTimer,
  useTaskbarTimestampController,
} from "./index.js";

/** test가 현재 Date와 예약된 timeout을 직접 진행하는 clock을 만든다. */
const createClock = (initial: Date) => {
  let current = initial;
  let nextTimerId = 0;
  const timers = new Map<number, () => void>();
  const scheduledDelays: number[] = [];
  const clearedTimerIds: number[] = [];

  const clock: TaskbarTimestampClock = Object.freeze({
    /** test가 지정한 최신 Date를 반환한다. */
    now: (): Date => current,
    /** callback과 delay를 기록하고 test 전용 timer identity를 반환한다. */
    setTimeout: (callback: () => void, delay: number): TaskbarTimestampTimer => {
      const timerId = ++nextTimerId;
      timers.set(timerId, callback);
      scheduledDelays.push(delay);
      return timerId as unknown as TaskbarTimestampTimer;
    },
    /** 아직 예약된 callback을 지우고 취소 identity를 기록한다. */
    clearTimeout: (timer: TaskbarTimestampTimer): void => {
      const timerId = timer as unknown as number;
      timers.delete(timerId);
      clearedTimerIds.push(timerId);
    },
  });

  return {
    clock,
    clearedTimerIds,
    scheduledDelays,
    /** 현재 예약된 timeout 수를 반환한다. */
    timerCount: (): number => timers.size,
    /** 다음 timeout이 실행되는 시각을 바꾸고 callback 하나를 실행한다. */
    runNextAt(value: Date): void {
      const next = timers.entries().next().value;
      if (next === undefined) throw new Error("실행할 Timestamp timer가 없습니다");
      timers.delete(next[0]);
      current = value;
      next[1]();
    },
  };
};

afterEach(() => cleanup());

describe("formatTaskbarTimestamp", () => {
  it("local Date를 24시간 HH:mm와 YYYY-MM-DD로 고정 형식화한다", () => {
    const localDate = new Date(2026, 6, 10, 6, 4, 59, 321);

    expect(formatTaskbarTimestamp(localDate)).toEqual({
      time: "06:04",
      date: "2026-07-10",
    });
  });

  it("자정의 local 날짜와 시간을 다음 calendar day로 표시한다", () => {
    const midnight = new Date(2027, 0, 1, 0, 0, 0, 0);

    expect(formatTaskbarTimestamp(midnight)).toEqual({
      time: "00:00",
      date: "2027-01-01",
    });
  });
});

describe("getMillisecondsUntilNextMinute", () => {
  it("초와 millisecond를 제외한 다음 분 경계 delay를 계산한다", () => {
    expect(getMillisecondsUntilNextMinute(new Date(2026, 6, 10, 15, 42, 58, 250))).toBe(1_750);
  });

  it("정확한 분 경계에서는 다음 분까지 60초를 예약한다", () => {
    expect(getMillisecondsUntilNextMinute(new Date(2026, 6, 10, 15, 42, 0, 0))).toBe(60_000);
  });
});

describe("startTaskbarTimestampScheduler", () => {
  it("mount 시 즉시 계산하고 자정 분 경계에서 날짜와 시간을 함께 갱신한다", () => {
    const fixture = createClock(new Date(2026, 11, 31, 23, 59, 58, 250));
    const values: Array<ReturnType<typeof formatTaskbarTimestamp>> = [];

    const stop = startTaskbarTimestampScheduler(fixture.clock, (value) => values.push(value));

    expect(values).toEqual([{ time: "23:59", date: "2026-12-31" }]);
    expect(fixture.scheduledDelays).toEqual([1_750]);

    fixture.runNextAt(new Date(2027, 0, 1, 0, 0, 0, 0));
    expect(values.at(-1)).toEqual({ time: "00:00", date: "2027-01-01" });
    expect(fixture.scheduledDelays).toEqual([1_750, 60_000]);

    stop();
  });

  it("지연된 tick에서도 누적값 대신 최신 Date를 읽고 새 분 경계를 보정한다", () => {
    const fixture = createClock(new Date(2026, 6, 10, 15, 42, 59, 900));
    const values: Array<ReturnType<typeof formatTaskbarTimestamp>> = [];

    const stop = startTaskbarTimestampScheduler(fixture.clock, (value) => values.push(value));
    fixture.runNextAt(new Date(2026, 6, 10, 15, 47, 17, 250));

    expect(values.at(-1)).toEqual({ time: "15:47", date: "2026-07-10" });
    expect(fixture.scheduledDelays).toEqual([100, 42_750]);

    stop();
  });

  it("cleanup을 여러 번 호출해도 예약 timer를 한 번만 취소한다", () => {
    const fixture = createClock(new Date(2026, 6, 10, 15, 42, 30, 0));
    const stop = startTaskbarTimestampScheduler(fixture.clock, () => undefined);

    expect(fixture.timerCount()).toBe(1);
    stop();
    stop();

    expect(fixture.timerCount()).toBe(0);
    expect(fixture.clearedTimerIds).toEqual([1]);
  });
});

describe("useTaskbarTimestampController", () => {
  it("StrictMode 재구독과 unmount 뒤 timer를 누적하지 않는다", () => {
    const fixture = createClock(new Date(2026, 6, 10, 15, 42, 0, 0));

    /** controller lifecycle만 실행하고 DOM은 만들지 않는다. */
    const Probe = () => {
      useTaskbarTimestampController(fixture.clock);
      return null;
    };

    const mounted = render(createElement(StrictMode, null, createElement(Probe)));

    expect(fixture.timerCount()).toBe(1);
    expect(fixture.clearedTimerIds).toEqual([1]);

    mounted.unmount();
    expect(fixture.timerCount()).toBe(0);
    expect(fixture.clearedTimerIds).toEqual([1, 2]);
  });

  it("SSR에서는 timer를 시작하지 않고 안정적인 준비 전 표현을 사용한다", () => {
    const fixture = createClock(new Date(2026, 6, 10, 15, 42, 0, 0));

    /** controller의 public 상태와 표시 값을 hydration 가능한 text로 렌더링한다. */
    const Probe = () => {
      const viewModel = useTaskbarTimestampController(fixture.clock);
      return createElement(
        "output",
        null,
        viewModel.status === "ready"
          ? `${viewModel.value.time} ${viewModel.value.date}`
          : "준비 중",
      );
    };

    const serverHtml = renderToString(createElement(Probe));
    expect(serverHtml).toContain("준비 중");
    expect(fixture.timerCount()).toBe(0);
  });
});
