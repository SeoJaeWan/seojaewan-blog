'use client';

import { Dialog } from '@base-ui/react/dialog';
import { type CSSProperties, type JSX, type ReactNode, useEffect, useRef, useState } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import { toDeviceVariant, useDevice } from '@/shared/hooks/use-device/use-device';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { getPanelMaxHeight, type PanelKind } from '@/shared/utils/panel-rules/panel-rules';

import { SearchBody } from './components/search-body/search-body';
import { SearchPanel } from './components/search-panel/search-panel';
import { StartBody } from './components/start-body/start-body';
import { StartMenuPanel } from './components/start-menu-panel/start-menu-panel';
import { StartPowerButton } from './components/start-power-button/start-power-button';
import { START_PROFILE } from './data/start-apps/start-apps';
import { useSearchKeyboard } from './hooks/use-search-keyboard/use-search-keyboard';
import { useStartLists } from './hooks/use-start-lists/use-start-lists';
import { useStartSearch } from './hooks/use-start-search/use-start-search';
import { getPowerMenuEntries } from './power-menu/power-menu-entries';
import type { StartAllView, StartItem } from './utils/start-items/start-items';

// 바깥 누르기·포커스 이동으로 보지 않는 요소. 작업 표시줄의 Start 버튼과 검색칸(`TaskbarDefault`가 단다)은 스스로 패널을 열고 닫는다.
const PANEL_TRIGGER_SELECTOR = '[data-panel-trigger]';

// 패널 안에서 연 메뉴(전원 메뉴, 보기 메뉴, 항목 메뉴)는 문서 끝에 포털된다.
const PORTALED_MENU_SELECTOR = '[role="menu"]';

// 검색 입력칸의 안내 글자(피그마 Start/Menu, Search/Panel `Device=Mobile`).
const SEARCH_PLACEHOLDER = '검색하려면 여기에 입력하세요';

/**
 * 패널 층(Start 메뉴와 검색 패널)을 그린다. 열린 패널은 패널 저장소(`usePanelStore`)가 정하고 둘 중 하나만 열린다.
 * 모바일은 패널이 화면 폭을 채우고 작업 표시줄 바로 위에 붙는다.
 * Start 고정됨·모두 목록과 검색 결과는 작업 공간 저장소의 항목에서 그리고, 항목은 열기 규칙(`useOpenItem`)대로 열며 열면 패널을 닫는다.
 * 검색어는 검색 저장소가 패널마다 따로 갖고(Start는 위쪽 검색칸, 검색 패널은 작업 표시줄 검색칸과 모바일 검색 패널 입력칸), 패널 저장소가 그 패널을 닫거나 바꿀 때 지운다.
 * 전원 메뉴의 `다시 시작`을 고르면 다시 시작 저장소로 다시 시작한다.
 * 패널은 Base UI 비모달 Dialog라 열려 있는 동안 Esc, 바깥 누르기, 포커스가 밖으로 나가면 닫는다. Start 버튼과 작업 표시줄 검색칸은 스스로 패널을 열고 닫으므로
 * 바깥으로 보지 않는다. 패널 안에서 연 메뉴(전원 메뉴, 보기 메뉴, 고정 항목 메뉴)는 문서 끝에 포털되지만 Base UI가 패널 안으로 보고, 메뉴가 열려 있을 때 Esc는 메뉴만 닫는다.
 * 작업 표시줄 검색칸에 포커스를 둔 채 여는 검색 패널은 포커스가 패널에 들어온 적이 없어 Base UI가 볼 수 없으므로, 포커스가 나가는 것은 여기서도 듣는다.
 * 닫으면 포커스는 Base UI가 연 곳으로 돌려준다. 항목을 열어 닫으면 새 창이 포커스를 가져간다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[Start 메뉴:검색]]
 * @codocs [[검색:개요]]
 * @codocs [[검색:입력칸]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[다시 시작:순서]]
 * @codocs [[접근성:역할]]
 * @codocs [[접근성:포커스]]
 * @returns 패널 층
 */
export function StartMenuLayer(): JSX.Element {
  const device = toDeviceVariant(useDevice());
  // Start 위쪽 검색칸과 검색 패널(작업 표시줄 검색칸)의 검색어는 따로다.
  const startSearch = useStartSearch(device, 'start');
  const panelSearch = useStartSearch(device, 'search');
  const lists = useStartLists(handleItemOpen);
  const restart = useRestartStore((state) => state.restart);
  const openPanel = usePanelStore((state) => state.openPanel);
  const isPowerMenuOpen = usePanelStore((state) => state.isPowerMenuOpen);
  const close = usePanelStore((state) => state.close);
  const setPowerMenuOpen = usePanelStore((state) => state.setPowerMenuOpen);
  const layerRef = useRef<HTMLDivElement>(null);
  const isOpen = openPanel !== null;
  useSearchKeyboard(openPanel, startSearch.openItem);

  useEffect(
    /** 패널이 열려 있는 동안 포커스가 패널 밖으로 나가는 것을 듣는다. */
    () => {
      if (!isOpen) {
        return undefined;
      }

      /**
       * 포커스가 패널과 패널의 메뉴, Start 버튼·검색칸 밖으로 나가면 닫는다.
       * @param event 포커스 이벤트
       */
      function handleFocusIn(event: FocusEvent): void {
        const { target } = event;
        if (
          target instanceof Element &&
          layerRef.current?.contains(target) !== true &&
          !isPanelTrigger(target) &&
          target.closest(PORTALED_MENU_SELECTOR) === null
        ) {
          close();
        }
      }

      document.addEventListener('focusin', handleFocusIn);
      return () => {
        document.removeEventListener('focusin', handleFocusIn);
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

  const powerMenuItems = getPowerMenuEntries(handleRestartClick);

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
        profilePhoto={<ImageAsset name={START_PROFILE.photo} />}
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
      return <StartBody view="no-results" device={device} />;
    }
    return (
      <StartBody
        view="results"
        device={device}
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
          recent={search.recent}
          recommended={search.recommended}
          onItemOpen={handleResultOpen}
        />
      );
    }
    if (search.results === null) {
      return <SearchBody view="no-results" device={device} />;
    }
    return (
      <SearchBody
        view="results"
        device={device}
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

  /** 패널이 닫으려 하면 닫는다. */
  function handlePanelClose(): void {
    close();
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
    <div ref={layerRef} className="contents">
      <PanelDialog
        panel="start"
        isOpen={openPanel === 'start'}
        label="시작"
        device={device}
        onClose={handlePanelClose}
      >
        {renderStartPanel}
      </PanelDialog>
      <PanelDialog
        panel="search"
        isOpen={openPanel === 'search'}
        label="검색"
        device={device}
        onClose={handlePanelClose}
      >
        {renderSearchPanel}
      </PanelDialog>
    </div>
  );
}

type PanelDialogProps = {
  /** 패널 종류. 줄어들 수 있는 가장 작은 높이가 다르다 */
  panel: PanelKind;
  /** 보여야 하는지(저장소의 값) */
  isOpen: boolean;
  /** 패널의 접근성 이름 */
  label: string;
  /** 화면 방식 */
  device: DeviceVariant;
  /** 패널을 닫아야 할 때 부른다(Esc, 바깥 누르기, 포커스가 밖으로 나감) */
  onClose: () => void;
  /** 패널을 그린다. 받은 클래스와 최대 높이를 패널 바탕(ShellSurface)에 넘긴다 */
  children: (panelClassName: string, panelStyle: CSSProperties | undefined) => ReactNode;
};

/**
 * 패널 하나를 작업 표시줄 위(데스크톱은 가운데, 모바일은 화면 폭)에 Base UI 비모달 Dialog로 그리고, 열고 닫을 때 올라오고 내려가는 움직임을 붙인다.
 * 움직임이 끝날 때까지 화면에 남기는 일은 Base UI가 맡는다. 패널은 작업 표시줄 뒤로 숨어야 하므로 문서 끝이 아니라 이 층 안에 포털한다.
 * 열면 Start는 위쪽 검색칸에 포커스를 둔다(첫 Tab 항목). 데스크톱 검색 패널은 입력칸이 작업 표시줄에 있어 포커스를 옮기지 않는다.
 * 움직이는 요소는 패널과 그 아래 틈(데스크톱 12)을 함께 감싸, 자기 높이만큼 내려가면 작업 표시줄 뒤로 모두 숨는다.
 * 틈은 누를 수 없고(아래 바탕화면으로 넘어간다) 패널 바탕만 누를 수 있다.
 * 화면이 낮아 작업 영역이 패널보다 작으면, 패널 높이를 작업 영역에서 틈을 뺀 값으로 줄여 위쪽이 잘리지 않게 한다(본문은 스크롤한다).
 * 위쪽과 아래쪽을 더한 높이보다는 줄이지 않는다.
 * @codocs [[Start 메뉴:구성]]
 * @codocs [[디자인 기반:모션]]
 * @codocs [[Start 메뉴:모바일]]
 * @codocs [[접근성:역할]]
 * @param props
 */
function PanelDialog(props: PanelDialogProps): ReactNode {
  const { panel, isOpen, label, device, onClose, children } = props;
  // 포털 자리 요소. Base UI 포털이 자리를 그릴 때 요소를 받아야 하므로 ref가 아니라 상태다.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const workArea = useWorkArea();
  const isMobile = device === 'mobile';

  /**
   * 패널을 닫으려 할 때 Start 버튼·검색칸을 누르거나 그리로 포커스가 옮긴 것이면 거른다. 그 버튼이 스스로 패널을 열고 닫는다.
   * @param isNextOpen 열려는지
   * @param details Base UI가 넘기는 바뀐 까닭과 이벤트
   */
  function handleOpenChange(isNextOpen: boolean, details: Dialog.Root.ChangeEventDetails): void {
    if (isNextOpen) {
      return;
    }
    const { event, reason } = details;
    const target = event instanceof FocusEvent ? event.relatedTarget : event.target;
    if (
      (reason === 'outside-press' || reason === 'focus-out') &&
      target instanceof Element &&
      isPanelTrigger(target)
    ) {
      details.cancel();
      return;
    }
    onClose();
  }

  // 작업 영역은 화면 크기에 따라 실행 중에 정해지는 값이라 토큰 클래스가 아닌 인라인 스타일로 준다.
  const panelStyle: CSSProperties | undefined =
    workArea === null ? undefined : { maxHeight: getPanelMaxHeight(workArea.height, device) };
  const panelClassName = isMobile ? 'pointer-events-auto w-full' : 'pointer-events-auto';
  return (
    <div
      ref={setContainer}
      className="absolute inset-x-spacing-none bottom-spacing-none flex justify-center"
    >
      <Dialog.Root open={isOpen} modal={false} onOpenChange={handleOpenChange}>
        <Dialog.Portal container={container} className="contents">
          <Dialog.Popup
            aria-label={label}
            initialFocus={panel === 'search' && !isMobile ? false : undefined}
            className={(state) =>
              `outline-none ${isMobile ? 'w-full' : 'pb-spacing-md'} ${state.transitionStatus === 'ending' ? 'motion-panel-exit' : 'motion-panel-enter'}`
            }
          >
            {children(panelClassName, panelStyle)}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/**
 * 요소가 Start 버튼이나 작업 표시줄 검색칸인지 본다.
 * @param element 요소
 * @returns 맞으면 true
 */
function isPanelTrigger(element: Element): boolean {
  return element.closest(PANEL_TRIGGER_SELECTOR) !== null;
}
