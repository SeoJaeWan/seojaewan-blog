'use client';

import { type CSSProperties, type JSX, type ReactNode, useEffect, useRef } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

import { SearchBody } from '@/features/start-menu/components/search-body/search-body';
import { SearchPanel } from '@/features/start-menu/components/search-panel/search-panel';
import type {
  StartAllView,
  StartItem,
} from '@/features/start-menu/components/start-body/start-body';
import { StartBody } from '@/features/start-menu/components/start-body/start-body';
import { StartMenuPanel } from '@/features/start-menu/components/start-menu-panel/start-menu-panel';
import { StartPowerButton } from '@/features/start-menu/components/start-power-button/start-power-button';
import { START_PROFILE } from '@/features/start-menu/data/start-apps/start-apps';
import { useSearchKeyboard } from '@/features/start-menu/hooks/use-search-keyboard/use-search-keyboard';
import { useStartLists } from '@/features/start-menu/hooks/use-start-lists/use-start-lists';
import { useStartSearch } from '@/features/start-menu/hooks/use-start-search/use-start-search';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { usePresence } from '@/shared/hooks/use-presence/use-presence';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { getPanelMaxHeight, type PanelKind } from '@/shared/utils/panel-rules/panel-rules';

// 바깥 클릭으로 보지 않는 요소. 작업 표시줄의 Start 버튼과 검색칸(`TaskbarDefault`가 단다)은 스스로 패널을 열고 닫는다.
const PANEL_TRIGGER_SELECTOR = '[data-panel-trigger]';

// 전원 메뉴의 `다시 시작` 아이콘(피그마 `Menu/Power`)이다.
const RESTART_ICON = 'icons/ic_fluent_arrow_clockwise_20_regular.svg';

// 검색 입력칸의 안내 글자(피그마 Start/Menu, Search/Panel `Device=Mobile`).
const SEARCH_PLACEHOLDER = '검색하려면 여기에 입력하세요';

/**
 * 패널 층(Start 메뉴와 검색 패널)을 그린다. 열린 패널은 패널 저장소(`usePanelStore`)가 정하고 둘 중 하나만 열린다.
 * 모바일은 패널이 화면 폭을 채우고 작업 표시줄 바로 위에 붙는다.
 * Start 고정됨·모두 목록과 검색 결과는 작업 공간 저장소의 항목에서 그리고, 항목은 열기 규칙(`useOpenItem`)대로 열며 열면 패널을 닫는다.
 * 검색어는 검색 저장소가 패널마다 따로 갖고(Start는 위쪽 검색칸, 검색 패널은 작업 표시줄 검색칸과 모바일 검색 패널 입력칸), 패널 저장소가 그 패널을 닫거나 바꿀 때 지운다.
 * 전원 메뉴의 `다시 시작`을 고르면 다시 시작 저장소로 다시 시작한다.
 * 열려 있는 동안 Esc를 누르거나 바깥(Start 버튼과 작업 표시줄 검색칸은 빼고)을 누르면 닫는다. 패널 안에서 연 메뉴(전원 메뉴, 보기 메뉴,
 * 고정 항목 메뉴)는 문서 끝에 포털되지만 React 트리로는 패널 안이라 바깥으로 보지 않는다. 메뉴가 열려 있을 때 Esc는 메뉴만 닫는다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[Start 메뉴:검색]]
 * @codocs [[검색:개요]]
 * @codocs [[검색:입력칸]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[작업 공간:다시 시작]]
 * @returns 패널 층
 */
export function StartMenuLayer(): JSX.Element {
  const device = useDevice();
  // Start 위쪽 검색칸과 검색 패널(작업 표시줄 검색칸)의 검색어는 따로다.
  const startSearch = useStartSearch(device, 'start');
  const panelSearch = useStartSearch(device, 'search');
  const lists = useStartLists(handleItemOpen);
  const restart = useRestartStore((state) => state.restart);
  const openPanel = usePanelStore((state) => state.openPanel);
  const isPowerMenuOpen = usePanelStore((state) => state.isPowerMenuOpen);
  const close = usePanelStore((state) => state.close);
  const setPowerMenuOpen = usePanelStore((state) => state.setPowerMenuOpen);
  // 이번 pointerdown이 패널 안(포털된 메뉴 포함)에서 일어났는지. React 이벤트가 문서 리스너보다 먼저 돌아 표시한다.
  const isPointerInsideRef = useRef(false);
  const isOpen = openPanel !== null;
  useSearchKeyboard(openPanel, startSearch.openItem);

  useEffect(
    /** 패널이 열려 있는 동안 Esc와 바깥 pointerdown을 듣는다. */
    () => {
      if (!isOpen) {
        return undefined;
      }
      // 닫히는 중인 패널 안을 누르면 표시가 남으므로 열 때마다 지운다.
      isPointerInsideRef.current = false;

      /**
       * Esc를 누르면 닫는다. 캡처 단계에서 들어, Base UI가 메뉴를 닫기 전에 메뉴가 열려 있었는지 본다.
       * @param event 키 이벤트
       */
      function handleKeyDown(event: KeyboardEvent): void {
        const isMenuOpen =
          usePanelStore.getState().isPowerMenuOpen ||
          document.querySelector('[role="menu"]') !== null;
        if (event.key !== 'Escape' || isMenuOpen) {
          return;
        }
        close();
      }

      /**
       * 바깥을 누르면 닫는다. 패널 안과 Start 버튼·검색칸은 뺀다.
       * @param event 포인터 이벤트
       */
      function handlePointerDown(event: PointerEvent): void {
        const isInside = isPointerInsideRef.current;
        isPointerInsideRef.current = false;
        if (isInside) {
          return;
        }
        if (event.target instanceof Element && event.target.closest(PANEL_TRIGGER_SELECTOR)) {
          return;
        }
        close();
      }

      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('pointerdown', handlePointerDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('pointerdown', handlePointerDown);
      };
    },
    [isOpen, close],
  );

  /**
   * 전원 메뉴를 열거나 닫는다. Base UI 메뉴가 부른다.
   * @param isMenuOpen 열지
   */
  function handlePowerMenuOpenChange(isMenuOpen: boolean): void {
    setPowerMenuOpen(isMenuOpen);
  }

  /** 전원 메뉴의 `다시 시작`을 고르면 메뉴와 Start를 닫고 다시 시작한다. */
  function handleRestartClick(): void {
    close();
    restart();
  }

  // 전원 메뉴 항목(피그마 `Menu/Power`). 절전과 시스템 종료는 두지 않는다([[작업 공간:다시 시작]]).
  const powerMenuItems: readonly MenuPopupEntry[] = [
    { label: '다시 시작', icon: RESTART_ICON, onClick: handleRestartClick },
  ];

  /**
   * Start 패널을 그린다.
   * @param panelClassName 패널 바탕에 넘길 클래스
   * @param panelStyle 패널 바탕에 넘길 최대 높이
   * @returns Start 메뉴
   */
  function renderStartPanel(
    panelClassName: string,
    panelStyle: CSSProperties | undefined,
  ): ReactNode {
    return (
      <StartMenuPanel
        device={device}
        className={panelClassName}
        style={panelStyle}
        searchBoxProps={{
          'aria-label': '시작 메뉴 검색',
          placeholder: SEARCH_PLACEHOLDER,
          value: startSearch.query,
          onValueChange: startSearch.setQuery,
        }}
        profileName={START_PROFILE.name}
        profilePhoto={<ImageAsset name={START_PROFILE.photo} className="size-full" />}
        powerButton={
          <StartPowerButton
            open={isPowerMenuOpen}
            onOpenChange={handlePowerMenuOpenChange}
            menuItems={powerMenuItems}
          />
        }
      >
        {renderStartBody()}
      </StartMenuPanel>
    );
  }

  /**
   * Start 본문을 그린다. 검색어가 있으면 검색 결과 화면(결과가 없으면 안내), 없으면 고정됨과 모두 목록이다.
   * @returns Start 본문
   */
  function renderStartBody(): ReactNode {
    const search = startSearch;
    if (!search.isSearching) {
      return (
        <StartBody
          view={lists.view}
          device={device}
          className="min-h-px w-full flex-1"
          pinned={lists.pinned}
          groups={lists.groups}
          onItemOpen={handleItemOpen}
          getPinnedMenuItems={lists.getPinnedMenuItems}
          getListMenuItems={lists.getListMenuItems}
          onPinnedMove={handlePinnedMove}
          onViewChange={handleViewChange}
        />
      );
    }
    if (search.results === null) {
      return <StartBody view="no-results" device={device} className="min-h-px w-full flex-1" />;
    }
    return (
      <StartBody
        view="results"
        device={device}
        className="min-h-px w-full flex-1"
        results={search.results}
        selectedId={search.selectedId}
        onItemOpen={handleResultOpen}
        onCopyLink={handleResultCopyLink}
      />
    );
  }

  /**
   * 검색 패널 본문을 그린다. 검색어가 있으면 검색 결과 화면(결과가 없으면 안내), 없으면 입력 전 화면(최근과 추천)이다.
   * @returns 검색 패널 본문
   */
  function renderSearchBody(): ReactNode {
    const search = panelSearch;
    if (!search.isSearching) {
      return (
        <SearchBody
          view="before-typing"
          device={device}
          className="min-h-px w-full flex-1"
          recent={search.recent}
          recommended={search.recommended}
          onItemOpen={handleResultOpen}
        />
      );
    }
    if (search.results === null) {
      return <SearchBody view="no-results" device={device} className="min-h-px w-full flex-1" />;
    }
    return (
      <SearchBody
        view="results"
        device={device}
        className="min-h-px w-full flex-1"
        results={search.results}
        selectedId={search.selectedId}
        onItemOpen={handleResultOpen}
        onCopyLink={handleResultCopyLink}
      />
    );
  }

  /**
   * 검색 패널을 그린다.
   * @param panelClassName 패널 바탕에 넘길 클래스
   * @param panelStyle 패널 바탕에 넘길 최대 높이
   * @returns 검색 패널
   */
  function renderSearchPanel(
    panelClassName: string,
    panelStyle: CSSProperties | undefined,
  ): ReactNode {
    return (
      <SearchPanel
        device={device}
        className={panelClassName}
        style={panelStyle}
        searchBoxProps={{
          'aria-label': '검색',
          placeholder: SEARCH_PLACEHOLDER,
          value: panelSearch.query,
          onValueChange: panelSearch.setQuery,
        }}
      >
        {renderSearchBody()}
      </SearchPanel>
    );
  }

  /** 패널 안에서 누른 것을 표시한다. 문서의 바깥 클릭 리스너가 읽는다. */
  function handlePanelPointerDown(): void {
    isPointerInsideRef.current = true;
  }

  /**
   * 고정 항목을 끌어 다른 칸 자리로 옮긴다.
   * @param id 끈 항목 id
   * @param targetId 놓인 칸의 항목 id
   */
  function handlePinnedMove(id: string, targetId: string): void {
    lists.movePinned(id, targetId);
  }

  /**
   * `보기:` 메뉴에서 고른 보기로 바꾼다.
   * @param nextView 고른 보기
   */
  function handleViewChange(nextView: StartAllView): void {
    lists.changeView(nextView);
  }

  /**
   * 검색 결과나 입력 전 화면의 항목을 연다.
   * @param id 항목 id
   */
  function handleResultOpen(id: string): void {
    startSearch.openItem(id);
  }

  /**
   * 카드의 `링크 복사`를 골랐을 때 그 항목의 링크를 복사한다.
   * @param id 항목 id
   */
  function handleResultCopyLink(id: string): void {
    startSearch.copyLink(id);
  }

  /**
   * Start 항목을 연다. 열기 규칙대로 열고(폴더 탐색기, 글 Chrome, 링크 새 탭, 앱 창), 항목을 열면 Start는 닫힌다.
   * @param item 연 항목
   */
  function handleItemOpen(item: StartItem): void {
    startSearch.openItem(item.id);
  }

  return (
    <>
      <PanelPresence
        panel="start"
        isOpen={openPanel === 'start'}
        label="시작"
        device={device}
        onPointerDown={handlePanelPointerDown}
      >
        {renderStartPanel}
      </PanelPresence>
      <PanelPresence
        panel="search"
        isOpen={openPanel === 'search'}
        label="검색"
        device={device}
        onPointerDown={handlePanelPointerDown}
      >
        {renderSearchPanel}
      </PanelPresence>
    </>
  );
}

type PanelPresenceProps = {
  /** 패널 종류. 줄어들 수 있는 가장 작은 높이가 다르다 */
  panel: PanelKind;
  /** 보여야 하는지(저장소의 값) */
  isOpen: boolean;
  /** 패널의 접근성 이름 */
  label: string;
  /** 화면 방식 */
  device: Device;
  /** 패널 안에서 눌렀을 때 부른다(포털된 메뉴 포함) */
  onPointerDown: () => void;
  /** 패널을 그린다. 받은 클래스와 최대 높이를 패널 바탕(ShellSurface)에 넘긴다 */
  children: (panelClassName: string, panelStyle: CSSProperties | undefined) => ReactNode;
};

/**
 * 패널 하나를 작업 표시줄 위(데스크톱은 가운데, 모바일은 화면 폭)에 그리고, 열고 닫을 때 올라오고 내려가는 움직임을 붙인다.
 * 움직이는 요소는 패널과 그 아래 틈(데스크톱 12)을 함께 감싸, 자기 높이만큼 내려가면 작업 표시줄 뒤로 모두 숨는다.
 * 틈은 누를 수 없고(아래 바탕화면으로 넘어간다) 패널 바탕만 누를 수 있다.
 * 화면이 낮아 작업 영역이 패널보다 작으면, 패널 높이를 작업 영역에서 틈을 뺀 값으로 줄여 위쪽이 잘리지 않게 한다(본문은 스크롤한다).
 * 위쪽과 아래쪽을 더한 높이보다는 줄이지 않는다.
 * @codocs [[Start 메뉴:구성]]
 * @codocs [[디자인 기반:모션]]
 * @codocs [[모바일:차이]]
 * @param props
 */
function PanelPresence(props: PanelPresenceProps): ReactNode {
  const { isOpen, label, device, children } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(panelRef, isOpen);
  const workArea = useWorkArea();
  if (!presence.isMounted) {
    return null;
  }
  const isMobile = device === 'mobile';
  // 작업 영역은 화면 크기에 따라 실행 중에 정해지는 값이라 토큰 클래스가 아닌 인라인 스타일로 준다.
  const panelStyle: CSSProperties | undefined =
    workArea === null
      ? undefined
      : { maxHeight: getPanelMaxHeight(workArea.height, device, props.panel) };
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-label={label}
        {...presence.presenceProps}
        onPointerDownCapture={props.onPointerDown}
        className={`${isMobile ? 'w-full' : 'pb-12'} ${presence.status === 'exiting' ? 'motion-panel-exit' : 'motion-panel-enter'}`}
      >
        {children(isMobile ? 'pointer-events-auto w-full' : 'pointer-events-auto', panelStyle)}
      </div>
    </div>
  );
}
