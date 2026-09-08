/**
 * @file WorkspaceStore만 사용하는 snapshot persistence port를 정의한다.
 *
 * 저장 매체와 schema migration 구현은 Application이 소유한다.
 */
import type { WorkspaceState } from "../../model/index.js";

/**
 * 완전한 `WorkspaceState` snapshot을 비동기로 읽고 저장하는 persistence port다.
 *
 * Next.js처럼 서버 렌더링을 사용하는 Application은 브라우저 저장소에 접근할 수 있는
 * 시점과 초기화 위치를 결정한다. headless는 localStorage를 직접 참조하지 않으며,
 * Application adapter가 저장 매체와 schema migration을 구현한다. 브라우저 WorkspaceStore는
 * 서버 요청 간 사용자 상태를 공유하는 용도로 초기화하지 않는다.
 */
export type WorkspaceStorage = Readonly<{
  /**
   * 저장된 snapshot을 읽고 저장값이 없으면 null을 반환한다.
   *
   * Store가 반환값의 schema를 검증하며 읽기 실패나 잘못된 값은 seed 복구로 처리한다.
   */
  load(): Promise<unknown>;
  /**
   * 이미 commit된 전체 snapshot을 저장하고 완료될 때 resolve한다.
   *
   * 저장 실패는 reject로 전달하며 메모리 상태의 rollback은 수행하지 않는다.
   */
  save(snapshot: WorkspaceState): Promise<void>;
}>;
