/**
 * @file Taskbar Timestamp의 pure model, scheduler port와 React controller public API를 조합한다.
 *
 * 실제 읽기 전용 DOM과 Root 배치는 UI Timestamp Component가 소유한다.
 */
export {
  type TaskbarTimestampViewModel,
  useTaskbarTimestampController,
} from "./controller/index.js";
export {
  formatTaskbarTimestamp,
  getMillisecondsUntilNextMinute,
  type TaskbarTimestampValue,
} from "./model/index.js";
export {
  startTaskbarTimestampScheduler,
  systemTaskbarTimestampClock,
  type TaskbarTimestampClock,
  type TaskbarTimestampTimer,
} from "./scheduler/index.js";
