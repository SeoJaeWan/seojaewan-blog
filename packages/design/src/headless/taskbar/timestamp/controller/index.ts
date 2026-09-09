/**
 * @file DOM-free Timestamp scheduler를 React mount lifecycle에 연결한다.
 *
 * 시간 형식, Root mode 판정과 실제 Timestamp DOM은 이 controller가 소유하지 않는다.
 */
import { useEffect, useState } from "react";

import type { TaskbarTimestampValue } from "../model/index.js";
import {
  startTaskbarTimestampScheduler,
  systemTaskbarTimestampClock,
  type TaskbarTimestampClock,
} from "../scheduler/index.js";

/** SSR 준비 전 상태 또는 현재 local Timestamp 값을 제공하는 읽기 모델이다. */
export type TaskbarTimestampViewModel =
  /** server render와 hydration 첫 render에서 공유하는 준비 전 표현이다. */
  | Readonly<{ status: "not-ready"; value: null }>
  /** mount 직후와 각 분 경계에서 다시 계산한 현재 표시 값이다. */
  | Readonly<{ status: "ready"; value: TaskbarTimestampValue }>;

const NOT_READY_TIMESTAMP: TaskbarTimestampViewModel = Object.freeze({
  status: "not-ready",
  value: null,
});

/**
 * mount 즉시 현재 Timestamp를 계산하고 다음 분 경계마다 갱신한다.
 *
 * server render와 hydration 첫 render는 같은 `not-ready` 값을 사용한다. unmount 또는 StrictMode
 * 재구독에서는 기존 timer를 정리하며 Application 시간 callback이나 저장소를 요구하지 않는다.
 */
export const useTaskbarTimestampController = (
  clock: TaskbarTimestampClock = systemTaskbarTimestampClock,
): TaskbarTimestampViewModel => {
  const [viewModel, setViewModel] = useState<TaskbarTimestampViewModel>(NOT_READY_TIMESTAMP);

  useEffect(
    () =>
      startTaskbarTimestampScheduler(clock, (value) => {
        setViewModel(Object.freeze({ status: "ready", value }));
      }),
    [clock],
  );

  return viewModel;
};
