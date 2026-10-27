import {
  getSearchDisplayOrder,
  groupSearchResults,
  searchWorkspace,
} from '@/shared/utils/search-rules/search-rules';
import type { WorkspaceState } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 키보드로 고른 항목을 찾기 위해 결과의 id를 화면에 보이는 차례로 돌려준다. 방향키와 Enter가 불릴 때 저장소의 지금 상태로 계산한다.
 * @codocs [[검색:결과 화면]]
 * @param state 작업 공간 상태
 * @param query 검색어
 * @returns 보이는 차례의 항목 id
 */
export function getSearchOrderIds(state: WorkspaceState, query: string): string[] {
  const resultSet = groupSearchResults(searchWorkspace(state, query));
  return resultSet === null ? [] : getSearchDisplayOrder(resultSet).map((item) => item.id);
}
