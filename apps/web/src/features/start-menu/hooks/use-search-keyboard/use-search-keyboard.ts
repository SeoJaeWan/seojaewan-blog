import { useEffect, useRef } from 'react';

import { getSearchOrderIds } from '@/features/start-menu/utils/search-order/search-order';
import { useSearchStore } from '@/shared/stores/search-store/search-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import type { OpenPanel } from '@/shared/utils/panel-rules/panel-rules';

/**
 * 검색 입력칸에서 ↑·↓로 결과를 고르고 Enter로 고른 항목을 열게 한다. 입력칸마다 핸들러를 달지 않고(작업 표시줄 검색칸은 다른 기능이 그린다)
 * 패널이 열려 있는 동안 문서에서 검색 입력칸(`role="searchbox"`)이 받은 키를 듣는다. 한글 조합 중인 키는 무시한다.
 * 검색어가 없거나 메뉴가 열려 있으면 하지 않는다. 검색어와 고른 항목은 열린 패널의 것이다(Start와 검색 패널의 검색어는 따로다).
 * @codocs [[검색:결과 화면]]
 * @codocs [[검색:입력칸]]
 * @param openPanel 열린 패널. 없으면 null
 * @param openItem 고른 항목을 여는 함수
 */
export function useSearchKeyboard(openPanel: OpenPanel, openItem: (id: string) => void): void {
  // 키를 누를 때는 늘 지금 열기 함수를 부른다.
  const openItemRef = useRef(openItem);

  useEffect(
    /** 지금 열기 함수를 기억한다. */
    () => {
      openItemRef.current = openItem;
    },
    [openItem],
  );

  useEffect(
    /**
     * 패널이 열려 있는 동안 검색 입력칸의 방향키와 Enter를 듣는다.
     * @returns 듣기를 멈추는 정리 함수
     */
    () => {
      if (openPanel === null) {
        return undefined;
      }
      const panel = openPanel;

      /**
       * ↑·↓는 고른 항목을 옮기고 Enter는 고른 항목을 연다.
       * @param event 키 이벤트
       */
      function handleKeyDown(event: KeyboardEvent): void {
        const { target } = event;
        const isSearchBox =
          target instanceof HTMLInputElement && target.getAttribute('role') === 'searchbox';
        if (!isSearchBox || event.isComposing || document.querySelector('[role="menu"]') !== null) {
          return;
        }
        const { panels, moveSelection } = useSearchStore.getState();
        const { query, selectedIndex } = panels[panel];
        if (query.trim() === '') {
          return;
        }
        const ids = getSearchOrderIds(useWorkspaceStore.getState(), query);
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            moveSelection(panel, 1, ids.length);
            break;
          case 'ArrowUp':
            event.preventDefault();
            moveSelection(panel, -1, ids.length);
            break;
          case 'Enter': {
            event.preventDefault();
            const id = ids[selectedIndex];
            if (id !== undefined) {
              openItemRef.current(id);
            }
            break;
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    },
    [openPanel],
  );
}
