/**
 * @file Taskbar primary panel의 DOM-free identity와 semantic snapshot을 정의한다.
 *
 * focus, presence, animation phase와 Start·Search 본문 데이터는 이 model이 소유하지 않는다.
 */

/**
 * Taskbar에서 서로 배타적으로 활성화되는 primary panel identity다.
 */
export type PrimaryPanelId = "start" | "search";

/**
 * active identity와 두 진입점의 독립 query를 보존하는 serializable snapshot이다.
 *
 * Search recent, result, detail과 Pin은 각 feature의 별도 상태가 소유한다.
 */
export type PrimaryPanelSnapshot = Readonly<{
  activePanel: PrimaryPanelId | null;
  startQuery: string;
  searchQuery: string;
}>;

/**
 * primary panel이 모두 닫히고 두 query가 비어 있는 초기 immutable snapshot을 만든다.
 */
export const createInitialPrimaryPanelSnapshot = (): PrimaryPanelSnapshot =>
  Object.freeze({ activePanel: null, startQuery: "", searchQuery: "" });
