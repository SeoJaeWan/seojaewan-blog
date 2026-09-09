/**
 * @file Taskbar Timestamp 갱신을 현재 clock과 다음 분 경계에 맞춰 scheduling한다.
 *
 * 표시 형식, React lifecycle과 DOM은 이 scheduler가 소유하지 않는다.
 */
import {
  formatTaskbarTimestamp,
  getMillisecondsUntilNextMinute,
  type TaskbarTimestampValue,
} from "../model/index.js";

declare const TASKBAR_TIMESTAMP_TIMER: unique symbol;

/** clock 구현만 해석하고 Timestamp scheduler는 그대로 돌려주는 opaque timer identity다. */
export type TaskbarTimestampTimer = Readonly<{ [TASKBAR_TIMESTAMP_TIMER]: true }>;

/** 현재 Date와 취소 가능한 timeout을 제공하는 Timestamp clock port다. */
export type TaskbarTimestampClock = Readonly<{
  /** 호출 시점의 현재 Date를 새로 반환한다. */
  now(): Date;
  /** callback을 지정한 delay 뒤에 한 번 실행한다. */
  setTimeout(callback: () => void, delay: number): TaskbarTimestampTimer;
  /** 아직 실행되지 않은 timer를 취소한다. */
  clearTimeout(timer: TaskbarTimestampTimer): void;
}>;

/** browser와 server JavaScript runtime의 현재 Date와 timeout을 사용하는 기본 clock이다. */
export const systemTaskbarTimestampClock: TaskbarTimestampClock = Object.freeze({
  now: (): Date => new Date(),
  setTimeout: (callback: () => void, delay: number): TaskbarTimestampTimer =>
    setTimeout(callback, delay) as unknown as TaskbarTimestampTimer,
  clearTimeout: (timer: TaskbarTimestampTimer): void =>
    clearTimeout(timer as unknown as ReturnType<typeof setTimeout>),
});

/**
 * 현재 값을 즉시 내보내고 다음 분 경계마다 최신 Date를 다시 읽는 scheduler를 시작한다.
 *
 * 반환 cleanup은 예약된 timer 하나만 취소한다. 이미 멈춘 scheduler의 cleanup을 다시 호출해도
 * callback이나 새 timer를 만들지 않는다.
 */
export const startTaskbarTimestampScheduler = (
  clock: TaskbarTimestampClock,
  onValue: (value: TaskbarTimestampValue) => void,
): (() => void) => {
  let active = true;
  let timer: TaskbarTimestampTimer | null = null;

  /** 현재 Date를 표시 값으로 내보내고 그 Date 기준 다음 분 경계를 예약한다. */
  const tick = (): void => {
    const current = clock.now();
    onValue(formatTaskbarTimestamp(current));
    if (!active) return;
    timer = clock.setTimeout(tick, getMillisecondsUntilNextMinute(current));
  };

  tick();

  /** scheduler를 멈추고 남은 timer가 있으면 정확히 한 번 취소한다. */
  return (): void => {
    if (!active) return;
    active = false;
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
  };
};
