/**
 * @file Taskbar Timestamp의 local 시간·날짜 형식과 다음 분 경계 계산을 제공한다.
 *
 * timer lifecycle, React 구독과 실제 DOM 표시는 이 pure model이 소유하지 않는다.
 */

/** Taskbar에 두 줄로 표시할 local 시간과 날짜다. */
export type TaskbarTimestampValue = Readonly<{
  /** 초를 제외한 24시간제 `HH:mm` 문자열이다. */
  time: string;
  /** local calendar 기준 `YYYY-MM-DD` 문자열이다. */
  date: string;
}>;

/** 두 자리보다 짧은 양의 정수를 앞쪽 0으로 채운다. */
const padTwoDigits = (value: number): string => String(value).padStart(2, "0");

/** local calendar year를 최소 네 자리로 표현한다. */
const formatYear = (value: number): string => String(value).padStart(4, "0");

/**
 * 현재 `Date`를 browser local timezone의 `HH:mm`와 `YYYY-MM-DD`로 변환한다.
 *
 * `Intl` locale 형식에 기대지 않아 두 public 문자열의 구분자와 자릿수를 항상 유지한다.
 */
export const formatTaskbarTimestamp = (value: Date): TaskbarTimestampValue =>
  Object.freeze({
    time: `${padTwoDigits(value.getHours())}:${padTwoDigits(value.getMinutes())}`,
    date: `${formatYear(value.getFullYear())}-${padTwoDigits(value.getMonth() + 1)}-${padTwoDigits(
      value.getDate(),
    )}`,
  });

/**
 * 주어진 시각 다음의 local 분 경계까지 남은 millisecond를 반환한다.
 *
 * 정확한 분 경계에서는 0이 아니라 다음 분까지의 60초를 반환해 즉시 반복 실행을 피한다.
 */
export const getMillisecondsUntilNextMinute = (value: Date): number =>
  60_000 - (value.getSeconds() * 1_000 + value.getMilliseconds());
