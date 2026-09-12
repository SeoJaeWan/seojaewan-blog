/**
 * @file Start Pin의 versioned snapshot을 읽고 쓰는 Application storage port를 정의한다.
 *
 * 저장 key, JSON 변환, localStorage와 migration은 이 파일의 책임이 아니다.
 */
import type { ResourceRef } from "../../../resources/index.js";

/**
 * 현재 Start Pin 저장 형식인 schema version 1의 정렬된 ResourceRef 목록이다.
 *
 * Resource metadata와 runtime 상태는 포함하지 않으며, 잘못된 외부 값은 Store가 복원할 때 정리한다.
 */
export type StartStorageSnapshot = Readonly<{
  schemaVersion: 1;
  resources: readonly ResourceRef[];
}>;

/**
 * Application이 브라우저 실행 경계에서 제공하는 Start 전용 비동기 저장 port다.
 *
 * headless import나 서버 render만으로 호출되지 않으며, 구체 storage key는 adapter가 소유한다.
 */
export type StartStorage = Readonly<{
  /**
   * Start 전용 key의 현재 저장값을 읽고 값이 없으면 null을 반환한다.
   *
   * 반환값의 schema와 Resource 존재 여부는 Store가 검증한다.
   */
  load(): Promise<unknown>;

  /**
   * 현재 전체 Start Pin snapshot을 저장한다.
   *
   * 부분 변경이나 legacy key 처리는 수행하지 않으며 실패는 Promise rejection으로 전달한다.
   */
  save(snapshot: StartStorageSnapshot): Promise<void>;
}>;
