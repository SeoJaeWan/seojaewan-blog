/**
 * @file Search 적용 상태, 공유 recent, selector와 실제 open orchestration의 public API를 조합한다.
 *
 * raw query와 panel 정책은 primaryPanel이, DOM 입력 mechanics는 제품 Component가 소유한다.
 */
export {
  type TaskbarSearchController,
  type TaskbarSearchControllerViewModel,
  useTaskbarSearchController,
} from "./controller/index.js";
export {
  type SearchAction,
  type SearchPanelSnapshot,
  type SearchRecentEntry,
  type SearchRecentStorage,
  type SearchRecentStorageSnapshot,
  type SearchResourceReader,
  type TaskbarSearchResult,
  type TaskbarSearchSnapshot,
} from "./model/index.js";
export {
  type SearchOpenAction,
  type SearchOpenResult,
  TaskbarSearchOperations,
  type TaskbarSearchOperationsOptions,
} from "./operations/index.js";
export {
  selectSearchCandidates,
  selectSearchRecommendations,
  selectTaskbarSearchResults,
} from "./selectors/index.js";
export { TaskbarSearchStore, type TaskbarSearchStoreOptions } from "./store/index.js";
