'use client';

import { type JSX, type ReactNode, useEffect, useRef } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

import { usePanelStore } from '@/core/panels/panels';
import { useOpenApp } from '@/core/window/window';
import { useWorkspaceStore } from '@/core/workspace/workspace';
import { SearchBody } from '@/features/start-menu/components/search-body/search-body';
import { SearchPanel } from '@/features/start-menu/components/search-panel/search-panel';
import type { StartItem } from '@/features/start-menu/components/start-body/start-body';
import { StartBody } from '@/features/start-menu/components/start-body/start-body';
import { StartMenuPanel } from '@/features/start-menu/components/start-menu-panel/start-menu-panel';
import { StartPowerButton } from '@/features/start-menu/components/start-power-button/start-power-button';
import {
  START_PROFILE,
  startAppGroups,
  startPinnedApps,
} from '@/features/start-menu/data/start-apps/start-apps';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { usePresence } from '@/shared/hooks/use-presence/use-presence';

// 바깥 클릭으로 보지 않는 요소. 작업 표시줄의 Start 버튼과 검색칸(`TaskbarDefault`가 단다)은 스스로 패널을 열고 닫는다.
const PANEL_TRIGGER_SELECTOR = '[data-panel-trigger]';

// 전원 메뉴의 `다시 시작` 아이콘(피그마 `Menu/Power`)이다.
const RESTART_ICON = 'icons/ic_fluent_arrow_clockwise_20_regular.svg';

// 검색 입력칸의 안내 글자(피그마 Start/Menu, Search/Panel `Device=Mobile`).
const SEARCH_PLACEHOLDER = '검색하려면 여기에 입력하세요';

// 검색 패널 입력 전 화면의 최근과 추천. 콘텐츠를 불러오기 전이라 비어 있다.
const EMPTY_SEARCH_ITEMS = [] as const;

/**
 * 패널 층(Start 메뉴와 검색 패널)을 그린다. 열린 패널은 패널 저장소(`usePanelStore`)가 정하고 둘 중 하나만 열린다.
 * 모바일은 패널이 화면 폭을 채우고 작업 표시줄 바로 위에 붙는다.
 * Start에서 앱 항목을 열면 창 저장소로 그 앱 창을 열고, 전원 메뉴의 `다시 시작`을 고르면 작업 공간 저장소로 다시 시작한다.
 * 열려 있는 동안 Esc를 누르거나 바깥(Start 버튼과 작업 표시줄 검색칸은 빼고)을 누르면 닫는다. 패널 안에서 연 전원 메뉴는
 * 문서 끝에 포털되지만 React 트리로는 패널 안이라 바깥으로 보지 않는다. 전원 메뉴가 열려 있을 때 Esc는 메뉴만 닫는다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[작업 공간:다시 시작]]
 * @returns 패널 층
 */
export function StartMenuLayer(): JSX.Element {
  const device = useDevice();
  const openApp = useOpenApp();
  const restart = useWorkspaceStore((state) => state.restart);
  const openPanel = usePanelStore((state) => state.openPanel);
  const isPowerMenuOpen = usePanelStore((state) => state.isPowerMenuOpen);
  const close = usePanelStore((state) => state.close);
  const setPowerMenuOpen = usePanelStore((state) => state.setPowerMenuOpen);
  // 이번 pointerdown이 패널 안(포털된 메뉴 포함)에서 일어났는지. React 이벤트가 문서 리스너보다 먼저 돌아 표시한다.
  const isPointerInsideRef = useRef(false);
  const isOpen = openPanel !== null;

  useEffect(
    /** 패널이 열려 있는 동안 Esc와 바깥 pointerdown을 듣는다. */
    () => {
      if (!isOpen) {
        return undefined;
      }
      // 닫히는 중인 패널 안을 누르면 표시가 남으므로 열 때마다 지운다.
      isPointerInsideRef.current = false;

      /**
       * Esc를 누르면 닫는다. 캡처 단계에서 들어, Base UI가 전원 메뉴를 닫기 전에 메뉴가 열려 있었는지 본다.
       * @param event 키 이벤트
       */
      function handleKeyDown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || usePanelStore.getState().isPowerMenuOpen) {
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
   * @returns Start 메뉴
   */
  function renderStartPanel(panelClassName: string): ReactNode {
    return (
      <StartMenuPanel
        device={device}
        className={panelClassName}
        searchBoxProps={{ 'aria-label': '시작 메뉴 검색', placeholder: SEARCH_PLACEHOLDER }}
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
        <StartBody
          view="list"
          device={device}
          className="min-h-px w-full flex-1"
          pinned={startPinnedApps}
          groups={startAppGroups}
          onItemOpen={handleItemOpen}
        />
      </StartMenuPanel>
    );
  }

  /**
   * 검색 패널을 그린다. 결과 계산 전이라 입력 전 화면이다.
   * @param panelClassName 패널 바탕에 넘길 클래스
   * @returns 검색 패널
   */
  function renderSearchPanel(panelClassName: string): ReactNode {
    return (
      <SearchPanel
        device={device}
        className={panelClassName}
        searchBoxProps={{ 'aria-label': '검색', placeholder: SEARCH_PLACEHOLDER }}
      >
        <SearchBody
          view="before-typing"
          device={device}
          className="min-h-px w-full flex-1"
          recent={EMPTY_SEARCH_ITEMS}
          recommended={EMPTY_SEARCH_ITEMS}
        />
      </SearchPanel>
    );
  }

  /** 패널 안에서 누른 것을 표시한다. 문서의 바깥 클릭 리스너가 읽는다. */
  function handlePanelPointerDown(): void {
    isPointerInsideRef.current = true;
  }

  /**
   * Start 항목을 연다. 앱이면 그 앱 창을 열고, 항목을 열면 Start는 닫힌다.
   * @param item 연 항목
   */
  function handleItemOpen(item: StartItem): void {
    close();
    if (item.kind === 'app') {
      openApp(item.app);
    }
  }

  return (
    <>
      <PanelPresence
        isOpen={openPanel === 'start'}
        label="시작"
        device={device}
        onPointerDown={handlePanelPointerDown}
      >
        {renderStartPanel}
      </PanelPresence>
      <PanelPresence
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
  /** 보여야 하는지(저장소의 값) */
  isOpen: boolean;
  /** 패널의 접근성 이름 */
  label: string;
  /** 화면 방식 */
  device: Device;
  /** 패널 안에서 눌렀을 때 부른다(포털된 메뉴 포함) */
  onPointerDown: () => void;
  /** 패널을 그린다. 받은 클래스를 패널 바탕(ShellSurface)에 넘긴다 */
  children: (panelClassName: string) => ReactNode;
};

/**
 * 패널 하나를 작업 표시줄 위(데스크톱은 가운데, 모바일은 화면 폭)에 그리고, 열고 닫을 때 올라오고 내려가는 움직임을 붙인다.
 * 움직이는 요소는 패널과 그 아래 틈(데스크톱 12)을 함께 감싸, 자기 높이만큼 내려가면 작업 표시줄 뒤로 모두 숨는다.
 * 틈은 누를 수 없고(아래 바탕화면으로 넘어간다) 패널 바탕만 누를 수 있다.
 * @codocs [[디자인 기반:모션]]
 * @codocs [[모바일:차이]]
 * @param props
 */
function PanelPresence(props: PanelPresenceProps): ReactNode {
  const { isOpen, label, device, children } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(panelRef, isOpen);
  if (!presence.isMounted) {
    return null;
  }
  const isMobile = device === 'mobile';
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
        {children(isMobile ? 'pointer-events-auto w-full' : 'pointer-events-auto')}
      </div>
    </div>
  );
}
