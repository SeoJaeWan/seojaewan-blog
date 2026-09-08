/**
 * @file Taskbar Timestamp의 읽기 전용 제품 Component public surface를 제공한다.
 *
 * local 시간 계산과 timer lifecycle은 headless Timestamp API가 소유한다.
 */
export { TaskbarTimestamp, type TaskbarTimestampProps } from "./taskbarTimestamp.js";
