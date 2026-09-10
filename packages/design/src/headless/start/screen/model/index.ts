/**
 * @file Start browse 화면의 DOM-free semantic snapshot을 정의한다.
 *
 * persisted Start Pin, query, scroll, focus와 animation 상태는 이 model에 포함하지 않는다.
 */

/** Start browse body에서 선택할 수 있는 semantic view다. */
export type StartScreenView = "pinned" | "all";

/**
 * Start browse body와 category index overlay의 transient 상태다.
 *
 * `StartSnapshot`의 Pin identity와 순서를 포함하지 않아 panel lifecycle reset과 persistence를
 * 구조적으로 분리한다.
 */
export type StartScreenSnapshot = Readonly<{
  view: StartScreenView;
  indexOpen: boolean;
}>;

/** pinned view와 닫힌 index를 가진 초기 immutable snapshot을 만든다. */
export const createInitialStartScreenSnapshot = (): StartScreenSnapshot =>
  Object.freeze({ view: "pinned", indexOpen: false });
