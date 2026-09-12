/**
 * @file 공통 Resource 검색의 pure 입력·결과와 selector public API를 조합한다.
 *
 * 제품 상태, recent와 UI 입력 수명은 이 진입점에 포함하지 않는다.
 */
export {
  type ResourceSearchInput,
  type ResourceSearchMatch,
  type ResourceSearchTier,
} from "./model/index.js";
export { normalizeResourceSearchQuery, searchResources } from "./selectors/index.js";
