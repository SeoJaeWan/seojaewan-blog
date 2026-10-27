import type {
  SearchItem,
  SearchRecommendedPost,
  SearchResultGroups,
} from '@/features/start-menu/components/search-body/search-body';
import { toSearchItem } from '@/features/start-menu/utils/start-items/start-items';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useOpenItem } from '@/shared/hooks/use-open-item/use-open-item';
import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useSearchStore } from '@/shared/stores/search-store/search-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { copyItemLink } from '@/shared/utils/item-link/item-link';
import {
  getSearchDisplayOrder,
  groupSearchResults,
  type SearchResultSet,
  searchWorkspace,
} from '@/shared/utils/search-rules/search-rules';
import { getLatestPosts, getRecentItems } from '@/shared/utils/workspace-rules/workspace-rules';

// 입력 전 화면의 최근 항목 최대 개수와 추천 글 개수(데스크톱 6, 모바일 3)다.
const RECENT_COUNT = 5;
const recommendedCounts = { desktop: 6, mobile: 3 } as const satisfies Record<Device, number>;

/** 검색 패널과 Start 검색 화면이 그리는 데이터와 동작 */
export type StartSearch = {
  /** 검색어 */
  query: string;
  /** 검색어를 바꾼다 */
  setQuery: (query: string) => void;
  /** 검색어가 있어 결과 화면을 보일지(공백만이면 아니다) */
  isSearching: boolean;
  /** 검색 결과. 결과가 없으면 null */
  results: SearchResultGroups | null;
  /** 고른 항목의 id. 결과가 없으면 undefined */
  selectedId: string | undefined;
  /** 입력 전 화면의 최근 항목 */
  recent: readonly SearchItem[];
  /** 입력 전 화면의 추천 글 */
  recommended: readonly SearchRecommendedPost[];
  /** 항목을 연다. 열면 패널이 닫힌다 */
  openItem: (id: string) => void;
  /** 항목의 링크를 복사한다 */
  copyLink: (id: string) => void;
};

/**
 * 검색 패널과 Start 안 검색 화면이 그릴 데이터를 만든다. 검색어와 고른 항목은 검색 저장소, 결과는 작업 공간 저장소의 항목에서 규칙대로 찾는다.
 * 검색어가 없으면 입력 전 화면(최근 5개, 추천 글 6개·모바일 3개)을 준다. 항목을 열면 열기 규칙대로 열고 패널을 닫는다(검색어는 패널이 닫힐 때 지운다).
 * @codocs [[검색:결과 화면]]
 * @codocs [[검색:입력 전 화면]]
 * @codocs [[Start 메뉴:검색]]
 * @param device 화면 방식. 추천 글 개수가 다르다
 * @returns 검색 데이터와 동작
 */
export function useStartSearch(device: Device): StartSearch {
  const workspace = useWorkspaceStore((state) => state);
  const query = useSearchStore((state) => state.query);
  const selectedIndex = useSearchStore((state) => state.selectedIndex);
  const setQuery = useSearchStore((state) => state.setQuery);
  const close = usePanelStore((state) => state.close);
  const openWorkspaceItem = useOpenItem();
  const isSearching = query.trim() !== '';
  const resultSet = isSearching ? groupSearchResults(searchWorkspace(workspace, query)) : null;
  const displayOrder = resultSet === null ? [] : getSearchDisplayOrder(resultSet);

  /**
   * 항목을 열고 패널을 닫는다.
   * @param id 항목 id
   */
  function openItem(id: string): void {
    close();
    openWorkspaceItem(id);
  }

  /**
   * 항목의 링크를 복사한다. 링크가 없는 항목(폴더)은 아무것도 하지 않는다.
   * @param id 항목 id
   */
  function copyLink(id: string): void {
    const item = workspace.items[id];
    if (item !== undefined) {
      copyItemLink(item);
    }
  }

  return {
    query,
    setQuery,
    isSearching,
    results: resultSet === null ? null : toResultGroups(resultSet),
    selectedId: displayOrder[selectedIndex]?.id,
    recent: getRecentItems(workspace, RECENT_COUNT).map(toSearchItem),
    recommended: getLatestPosts(workspace, recommendedCounts[device]).map(
      /**
       * 글 하나를 추천 글 줄로 바꾼다.
       * @param post 글 항목
       * @returns 추천 글
       */
      (post) => ({
        id: post.id,
        title: post.name,
        date: post.date,
      }),
    ),
    openItem,
    copyLink,
  };
}

/**
 * 규칙이 묶은 결과를 결과 화면이 그리는 모양으로 바꾼다.
 * @param resultSet 묶은 결과
 * @returns 결과 화면의 결과
 */
function toResultGroups(resultSet: SearchResultSet): SearchResultGroups {
  const { bestMatch } = resultSet;
  return {
    bestMatch: {
      ...toSearchItem(bestMatch),
      date: bestMatch.kind === 'post' ? bestMatch.date : undefined,
    },
    folders: resultSet.folders.map(toSearchItem),
    posts: resultSet.posts.map(toSearchItem),
    links: resultSet.links.map(toSearchItem),
  };
}
