/**
 * @file Start 화면의 Resource Pin snapshot과 위치 이동 intent를 정의한다.
 *
 * Resource 원본, 표시 metadata와 저장 orchestration은 이 파일의 책임이 아니다.
 */
import type { ResourceRef } from "../../resources/index.js";

/**
 * Start 화면에 고정된 하나의 Resource identity를 나타낸다.
 *
 * title, icon, URL, parent와 body는 포함하지 않으며 현재 원본은 kind별 Catalog에서 조회한다.
 */
export type StartPinnedItem = Readonly<{
  resource: ResourceRef;
}>;

/**
 * Start 화면이 소유하는 정렬된 Pin 목록의 immutable snapshot이다.
 *
 * Workspace 배치와 Window 또는 Taskbar 상태는 포함하지 않는다.
 */
export type StartSnapshot = Readonly<{
  pinnedItems: readonly StartPinnedItem[];
}>;

/**
 * Start Pin을 현재 순서에서 이동시키는 상대 또는 절대 intent다.
 *
 * 실제 drag와 Context Menu interaction은 제품 Component가 이 intent로 변환한다.
 */
export type StartReorderAction = "first" | "left" | "right";

/**
 * drag가 지정한 Start grid의 0-based 최종 위치를 나타낸다.
 *
 * 범위를 벗어나거나 정수가 아닌 index는 Store가 거절하며 여러 상대 이동으로 분해하지 않는다.
 */
export type StartReorderDestination = Readonly<{
  type: "index";
  index: number;
}>;

/**
 * Context Menu의 상대 이동과 drag의 최종 위치 이동을 하나의 atomic Store 명령으로 전달한다.
 *
 * pointer 좌표와 grid geometry는 포함하지 않으며 제품 Component가 최종 index로 변환한다.
 */
export type StartReorderIntent = StartReorderAction | StartReorderDestination;
