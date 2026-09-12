/**
 * @file Search의 적용 query, detail과 공유 recent 저장 계약을 정의한다.
 *
 * raw 입력은 primaryPanel이, timer·IME·focus는 제품 Component가 소유한다.
 */
import type { ResourceReaders, ResourceRef } from "../../../resources/index.js";
import type { PrimaryPanelId } from "../../primaryPanel/index.js";

/**
 * 성공한 실제 ResourceRef와 실행 완료 시각만 보존하는 recent 항목이다.
 *
 * query, title, URL과 Workspace parent는 저장하지 않는다.
 */
export type SearchRecentEntry = Readonly<{ resource: ResourceRef; openedAt: number }>;

/**
 * Start와 Taskbar Search가 공유하는 versioned 저장 snapshot이다.
 *
 * 검색 transient와 Pin 데이터는 포함하지 않는다.
 */
export type SearchRecentStorageSnapshot = Readonly<{
  schemaVersion: 1;
  recent: readonly SearchRecentEntry[];
}>;

/**
 * Application이 브라우저에서 주입하는 recent load/save port다.
 *
 * 저장 key, localStorage 접근과 schema migration은 adapter가 소유한다.
 */
export type SearchRecentStorage = Readonly<{
  /**
   * 저장값을 읽으며 읽을 수 없는 값과 rejection은 빈 복원으로 처리한다.
   */
  load(): unknown;
  /**
   * 현재 세션 snapshot을 저장하며 rejection은 세션 기록을 되돌리지 않는다.
   */
  save(snapshot: SearchRecentStorageSnapshot): void | Promise<void>;
}>;

/**
 * 한 검색 진입점의 적용 query와 입력 revision, pending, detail 상태다.
 *
 * raw 문자열을 복제하지 않고 이전 결과와 실행 가능 여부를 분리한다.
 */
export type SearchPanelSnapshot = Readonly<{
  query: string;
  version: number;
  pending: boolean;
  detail: ResourceRef | null;
}>;

/**
 * 두 검색 진입점의 transient와 공유 recent를 구독하는 immutable snapshot이다.
 *
 * Catalog 원본과 검색 결과는 저장하지 않고 selector로 파생한다.
 */
export type TaskbarSearchSnapshot = Readonly<{
  panels: Readonly<Record<PrimaryPanelId, SearchPanelSnapshot>>;
  recent: readonly SearchRecentEntry[];
}>;

/**
 * Store가 현재 Catalog·Workspace 준비 여부를 확인하는 port다.
 *
 * 준비 전 null은 유효 recent를 삭제할 수 있는 빈 Catalog와 구분된다.
 */
export type SearchResourceReader = Readonly<{
  /**
   * 준비된 현재 원본 reader를 반환하며 준비 전에는 null을 반환한다.
   */
  getReaders(): ResourceReaders | null;
}>;

/**
 * Search transient를 변경하는 serializable 제품 Action이다.
 *
 * raw query 변경은 primaryPanel update-query로 전달한다.
 */
export type SearchAction =
  /**
   * debounce·IME 완료 시 같은 입력 revision의 query만 적용한다.
   */
  | Readonly<{ type: "search.apply-query"; panel: PrimaryPanelId; query: string; version: number }>
  /**
   * 현재 결과의 detail을 열며 pending 동안에는 상태를 보존한다.
   */
  | Readonly<{ type: "search.show-detail"; panel: PrimaryPanelId; resource: ResourceRef }>
  /**
   * query와 목록을 보존하고 detail만 닫는다.
   */
  | Readonly<{ type: "search.hide-detail"; panel: PrimaryPanelId }>
  /**
   * 현재 원본에 없는 recent를 정리하고 저장한다.
   */
  | Readonly<{ type: "search.reconcile" }>;

/**
 * Search 명령의 반영 여부와 저장 실패를 분리한 결과다.
 *
 * 저장 실패에 따른 사용자 알림·재시도 UI·rollback은 제공하지 않는다.
 */
export type TaskbarSearchResult = Readonly<{
  changed: boolean;
  persistence: "not-required" | "saved" | "failed";
}>;
