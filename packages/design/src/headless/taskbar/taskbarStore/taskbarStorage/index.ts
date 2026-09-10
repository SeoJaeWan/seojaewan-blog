/**
 * @file Taskbar Pin의 versioned snapshot을 읽고 쓰는 Application storage port를 정의한다.
 *
 * 저장 key, JSON 변환, legacy migration과 localStorage는 Application이 소유한다.
 */
import type { TaskbarItem } from "../../model/index.js";

/**
 * schema version 1의 정렬된 Taskbar Pin 저장값이다.
 *
 * visible-only 위치, Window와 Resource metadata는 포함하지 않는다.
 */
export type TaskbarStorageSnapshot = Readonly<{
  schemaVersion: 1;
  items: readonly TaskbarItem[];
}>;

/**
 * 브라우저 실행 경계에서 주입하는 Taskbar 전용 비동기 저장 port다.
 */
export type TaskbarStorage = Readonly<{
  /**
   * Taskbar 전용 key의 parsed 값을 읽고 값이 없으면 null을 반환한다.
   */
  load(): Promise<unknown>;

  /**
   * 현재 전체 persistent Taskbar Pin snapshot을 저장한다.
   */
  save(snapshot: TaskbarStorageSnapshot): Promise<void>;
}>;
