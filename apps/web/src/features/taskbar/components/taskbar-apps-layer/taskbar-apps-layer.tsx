import type { JSX, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { useOpenItem } from '@/shared/hooks/use-open-item/use-open-item';
import { usePointerDrag } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';
import { useReorderMotion } from '@/shared/hooks/use-reorder-motion/use-reorder-motion';
import { useRovingFocus } from '@/shared/hooks/use-roving-focus/use-roving-focus';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import {
  getMobilePreviewLayout,
  getPreviewCardWidth,
  getPreviewThumbnailBox,
  getThumbnailScale,
  getWindowAspectRatio,
} from '@/shared/utils/window-geometry/window-geometry';
import type { OpenWindow, RenderWindow, WindowApp } from '@/shared/utils/window-rules/window-rules';
import {
  getAppWindows,
  getTaskbarAppAction,
  getTaskbarAppIndicator,
  getWindowRect,
} from '@/shared/utils/window-rules/window-rules';
import {
  CHROME_LATEST_POST_COUNT,
  getFavoriteFolders,
  getLatestPosts,
} from '@/shared/utils/workspace-rules/workspace-rules';

import type { TaskbarAppMenuAction } from './app-menu/app-menu-entries';
import {
  getAppMenuEntries,
  getChromeJumpListEntries,
  getExplorerJumpListEntries,
} from './app-menu/app-menu-entries';
import { TaskbarAppItem } from './components/app-item/app-item';
import { TaskbarWindowPreviewList } from './components/taskbar-window-preview-list/taskbar-window-preview-list';
import { useHoverPreview } from './hooks/use-hover-preview/use-hover-preview';
import { useOpenApp } from './hooks/use-open-app/use-open-app';
import { findTaskbarAppAt, TASKBAR_APP_ATTRIBUTE } from './utils/taskbar-app-drag/taskbar-app-drag';
import { getTaskbarApps } from './utils/taskbar-app-rules/taskbar-app-rules';

/** 지금 띄운 창 미리보기. 어느 앱의 것이고 클릭으로 열었는지(click) 마우스를 올려 열었는지(hover)다 */
type OpenedPreview = {
  app: WindowApp;
  source: 'click' | 'hover';
};

export type TaskbarAppsLayerProps = {
  renderWindow: RenderWindow;
  getWindowTitle: (window: OpenWindow) => string;
};

/**
 * 작업 표시줄의 앱 버튼들을 그리고 창 저장소에 잇는 층이다.
 * - 아래 표시는 맨 앞 창이 이 앱이면 active, 열린 창이 있으면 running이다.
 * - 버튼을 누르면 열린 창 수와 순서에 따라 새로 열기, 최소화, 복원, 창 미리보기 목록 열기 가운데 하나를 한다.
 * - 창이 있는 앱 버튼에 마우스를 400ms 올리면 미리보기를 띄우고(창이 하나여도), 버튼과 미리보기 밖으로 나가 300ms 지나면 닫는다(`useHoverPreview`).
 *   터치는 올리는 동작이 없어 기존 클릭 동작만 쓴다. 클릭으로 연 목록도 마우스가 나가면 같은 시간 뒤에 닫힌다.
 *   마우스를 올려 연 목록을 누르면 닫지 않고 그대로 둔다(누른 뜻은 목록을 보는 것이라 이미 이뤄졌다).
 * - 그리는 앱은 고정한 앱(작업 공간 저장소의 고정 순서)과 창이 열린 앱이다. 고정하지 않은 실행 중인 앱은 뒤에 붙고, 창을 모두 닫으면 사라진다.
 * - 버튼을 우클릭(모바일은 길게 누르기)하면 버튼 위 가운데에 우클릭 메뉴를 연다. 앱 이름(새 창), 고정·제거, 창 닫기·모든 창 닫기다.
 *   점프 목록이 있는 앱(Chrome, 탐색기)은 그 위에 점프 목록을 붙인다(`getAppJumpList`).
 *   메뉴가 열리면 미리보기는 닫는다.
 * - 데스크톱에서 고정한 앱 버튼을 끌어 다른 고정 앱 버튼 자리에 놓으면 순서가 바뀐다. 끌기 뒤에 따라오는 클릭은 버튼 동작을 하지 않는다. 모바일은 끌기가 없다.
 *   끄는 버튼은 커진 채 포인터를 가로로 따라오고, 밀려나는 버튼은 새 자리로 미끄러지고, 놓으면 새 자리로 들어간다(`useReorderMotion`).
 *   끄는 동안 그 버튼은 호버·눌림 바탕을 끄고 실행 표시를 숨긴다. 놓으면 돌아온다.
 * - 미리보기 카드 너비는 창 비율을 따르고(`aspectRatio`), 축소 화면은 그 카드의 자리를 꽉 채운다.
 * - 모바일은 미리보기 목록을 화면 폭(좌우 12px 여백)에 맞춰 작업 표시줄 위 가운데에 띄우고, 카드가 많으면 카드를 같은 너비로 줄인다.
 * - 미리보기 목록은 실제 창을 `WindowThumbnail`로 줄여 보여 주고, 고르면 그 창을 맨 앞으로, 닫기를 누르면 그 창을 닫는다.
 *   바깥을 누르거나 Esc를 누르면 닫힌다. 축소 화면 안의 창 내용과 제목은 앱을 아는 쓰는 곳이 `renderWindow`·`getWindowTitle`로 넘긴다.
 * - 앱 버튼들은 Tab 한 번에 닿고(맨 앞 창의 앱, 없으면 첫 버튼) 안에서 ←/→로 옮긴다.
 * - 키보드로 목록을 열면 첫 카드로 포커스를 옮기고, Esc로 닫거나 마지막 카드를 닫으면 앱 버튼으로 돌려준다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @codocs [[작업 표시줄:고정과 순서]]
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[접근성:Tab]]
 * @codocs [[접근성:포커스]]
 * @param props 컴포넌트 속성
 * @param props.renderWindow 앱 창을 그린다. 미리보기 축소 화면 안에 쓴다. 앱마다 다른 창 조립은 쓰는 곳(앱 등록표)이 고른다
 * @param props.getWindowTitle 창 제목을 정한다. 미리보기 제목이 된다
 * @returns 앱 버튼들
 */
export function TaskbarAppsLayer({
  renderWindow,
  getWindowTitle,
}: TaskbarAppsLayerProps): JSX.Element {
  const windows = useWindowStore((state) => state.windows);
  const order = useWindowStore((state) => state.order);
  const minimize = useWindowStore((state) => state.minimize);
  const restore = useWindowStore((state) => state.restore);
  const close = useWindowStore((state) => state.close);
  const taskbarPins = useWorkspaceStore((state) => state.taskbarPins);
  const pinToTaskbar = useWorkspaceStore((state) => state.pinToTaskbar);
  const unpinFromTaskbar = useWorkspaceStore((state) => state.unpinFromTaskbar);
  const workspaceItems = useWorkspaceStore((state) => state.items);
  const favoritePins = useWorkspaceStore((state) => state.favoritePins);
  const unpinFromFavorites = useWorkspaceStore((state) => state.unpinFromFavorites);
  const openItem = useOpenItem();
  const startPointerDrag = usePointerDrag();
  const openApp = useOpenApp();
  const device = useDevice();
  const workArea = useWorkArea();
  const [preview, setPreview] = useState<OpenedPreview | null>(null);
  // 끌어 순서를 바꾸는 중인 버튼의 앱. 그 버튼은 호버·눌림 바탕과 실행 표시를 끈다.
  const [draggingApp, setDraggingApp] = useState<WindowApp | null>(null);
  // 우클릭 메뉴가 열린 버튼의 앱. 메뉴는 한 번에 하나만 열린다.
  const [menuApp, setMenuApp] = useState<WindowApp | null>(null);
  const previewApp = preview?.app ?? null;
  const containerRef = useRef<HTMLDivElement>(null);
  const reorderMotion = useReorderMotion(containerRef, {
    itemAttribute: TASKBAR_APP_ATTRIBUTE,
    axis: 'x',
  });
  // 앱 버튼을 끄는 중인지, 방금 끌었는지(끌기 뒤에 따라오는 클릭을 거른다)다.
  const isDraggingRef = useRef(false);
  const isDraggedRef = useRef(false);
  // 키보드로 연 미리보기 목록의 첫 카드로 포커스를 옮길지.
  const shouldFocusPreviewRef = useRef(false);
  // 앱 버튼으로 포커스를 돌려줄 앱. 미리보기의 마지막 카드를 닫으면 카드가 사라진 뒤 옮긴다.
  const focusReturnAppRef = useRef<WindowApp | null>(null);
  const rovingProps = useRovingFocus(containerRef, {
    orientation: 'horizontal',
    itemSelector: '[data-taskbar-app]',
    selectedSelector: '[data-indicator="active"]',
  });
  const state = { windows, order, lastSerial: 0 };
  // 창을 모두 닫으면 목록도 닫힌다.
  const openPreviewApp =
    previewApp !== null && getAppWindows(state, previewApp).length > 0 ? previewApp : null;
  const apps = getTaskbarApps(taskbarPins, state);
  if (preview !== null && openPreviewApp === null) {
    // 앱의 창을 모두 닫으면 열린 미리보기 상태도 지운다. 남기면 그 앱 창을 다시 열 때 미리보기가 저절로 열린다.
    setPreview(null);
  }

  const hover = useHoverPreview<WindowApp>({
    onOpen: openHoverPreview,
    onClose: closePreview,
  });

  /**
   * 마우스를 올린 채 기다리면 그 앱의 미리보기를 연다. 이미 클릭으로 연 같은 앱의 목록은 그대로 둔다.
   * @param app 마우스를 올린 버튼의 앱
   */
  function openHoverPreview(app: WindowApp): void {
    if (menuApp !== null || isDraggingRef.current) {
      return;
    }
    setPreview((current) => (current?.app === app ? current : { app, source: 'hover' }));
  }

  /** 버튼과 미리보기 밖으로 나가 기다리면 미리보기를 닫는다. */
  function closePreview(): void {
    setPreview(null);
  }

  useLayoutEffect(
    /** 키보드로 연 목록의 첫 카드로, 마지막 카드를 닫았으면 앱 버튼으로 포커스를 옮긴다. */
    () => {
      if (shouldFocusPreviewRef.current && openPreviewApp !== null) {
        shouldFocusPreviewRef.current = false;
        containerRef.current?.querySelector<HTMLElement>('[role="button"]')?.focus();
      }
      if (focusReturnAppRef.current !== null) {
        findAppButton(containerRef.current, focusReturnAppRef.current)?.focus();
        focusReturnAppRef.current = null;
      }
    },
  );

  useEffect(
    /** 미리보기 목록이 열려 있는 동안 바깥 누르기와 Esc를 받아 닫는다. */
    () => {
      if (openPreviewApp === null) {
        return undefined;
      }
      /**
       * 앱 버튼과 목록 바깥을 누르면 목록을 닫는다.
       * @param event 누르기 이벤트
       */
      function handleDocumentPointerDown(event: PointerEvent): void {
        if (event.target instanceof Node && containerRef.current?.contains(event.target) === true) {
          return;
        }
        setPreview(null);
      }
      /**
       * Esc를 누르면 목록을 닫는다. 포커스가 목록 안에 있었으면 앱 버튼으로 돌려준다.
       * @param event 키 이벤트
       */
      function handleDocumentKeyDown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') {
          return;
        }
        if (containerRef.current?.contains(document.activeElement) === true) {
          focusReturnAppRef.current = openPreviewApp;
        }
        setPreview(null);
      }
      document.addEventListener('pointerdown', handleDocumentPointerDown);
      document.addEventListener('keydown', handleDocumentKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handleDocumentPointerDown);
        document.removeEventListener('keydown', handleDocumentKeyDown);
      };
    },
    [openPreviewApp],
  );

  /**
   * 앱 버튼을 누르면 할 일을 정해 한다. 미리보기 목록이 열린 앱 버튼을 다시 누르면 목록을 닫는다.
   * @param app 누른 버튼의 앱
   * @param isKeyboard 키보드로 눌렀는지
   */
  function handleAppClick(app: WindowApp, isKeyboard: boolean): void {
    hover.cancel();
    if (isDraggedRef.current) {
      isDraggedRef.current = false;
      return;
    }
    const action = getTaskbarAppAction(useWindowStore.getState(), app);
    if (action.type === 'preview') {
      // 클릭으로 연 목록을 다시 누르면 닫는다. 마우스를 올려 연 목록은 누르면 클릭으로 연 것으로 바꿔 그대로 둔다.
      const isClosing = preview?.app === app && preview.source === 'click';
      shouldFocusPreviewRef.current = isKeyboard && !isClosing;
      setPreview(isClosing ? null : { app, source: 'click' });
      return;
    }
    setPreview(null);
    switch (action.type) {
      case 'open': {
        openApp(app);
        break;
      }
      case 'minimize': {
        minimize(action.id);
        break;
      }
      case 'restore': {
        restore(action.id);
        break;
      }
    }
  }

  /**
   * 우클릭 메뉴가 열리거나 닫히려 하면 열린 버튼을 기억하고, 열리면 미리보기를 닫는다.
   * @param app 메뉴가 달린 버튼의 앱
   * @param isOpen 열리려는지
   */
  function handleMenuOpenChange(app: WindowApp, isOpen: boolean): void {
    if (isOpen) {
      hover.cancel();
      setPreview(null);
      setMenuApp(app);
      return;
    }
    setMenuApp((current) => (current === app ? null : current));
  }

  /**
   * 우클릭 메뉴 항목을 고르면 그 일을 한다. 새 창은 앱 이름 줄, 창 닫기는 그 앱의 열린 창을 모두 닫는다.
   * @param app 메뉴가 달린 버튼의 앱
   * @param action 고른 일
   */
  function handleMenuAction(app: WindowApp, action: TaskbarAppMenuAction): void {
    setMenuApp(null);
    switch (action) {
      case 'open-new': {
        openApp(app);
        break;
      }
      case 'pin': {
        pinToTaskbar(app);
        break;
      }
      case 'unpin': {
        unpinFromTaskbar(app);
        break;
      }
      case 'close-windows': {
        for (const target of getAppWindows(useWindowStore.getState(), app)) {
          close(target.id);
        }
        break;
      }
    }
  }

  /**
   * 앱 우클릭 메뉴의 앱 묶음 위에 붙일 점프 목록을 만든다. 점프 목록이 없는 앱은 undefined다.
   * Chrome은 새 탭 페이지와 같은 Blog 최신 글("자주 방문")과 "새 창"("작업")이다. 글을 고르면 그 글을 Chrome 맨 앞 창의 새 탭으로(없으면 새 창으로) 연다.
   * 탐색기는 즐겨찾기 폴더("고정됨")다. 폴더를 고르면 그 폴더를 연 새 탐색기 창을 띄우고, 압정 해제 버튼이나 항목 메뉴로 즐겨찾기에서 뺀다(점프 목록은 열어 둔다).
   * @codocs [[작업 표시줄:우클릭 메뉴]]
   * @param app 메뉴가 달린 버튼의 앱
   * @returns 점프 목록 항목
   */
  function getAppJumpList(app: WindowApp): MenuPopupEntry[] | undefined {
    switch (app) {
      case 'chrome':
        return getChromeJumpListEntries({
          posts: getLatestPosts({ items: workspaceItems }, CHROME_LATEST_POST_COUNT).map(
            /**
             * 글을 점프 목록 글로 바꾼다.
             * @param post 글
             * @returns 점프 목록 글
             */
            (post) => ({ id: post.id, title: post.name }),
          ),
          onOpenPost: (id) => {
            setMenuApp(null);
            openItem(id);
          },
          onNewWindow: () => {
            handleMenuAction(app, 'open-new');
          },
        });
      case 'file-explorer':
        return getExplorerJumpListEntries({
          folders: getFavoriteFolders({ items: workspaceItems, favoritePins }).map(
            /**
             * 폴더를 점프 목록 폴더로 바꾼다.
             * @param folder 폴더
             * @returns 점프 목록 폴더
             */
            (folder) => ({ id: folder.id, name: folder.name }),
          ),
          onOpenFolder: (id) => {
            setMenuApp(null);
            openItem(id);
          },
          onUnpin: unpinFromFavorites,
        });
    }
  }

  /**
   * 데스크톱에서 고정한 앱 버튼 위에서 포인터를 누르면 끌어 순서 바꾸기를 시작한다. 끄는 동안 포인터 아래 고정 앱 버튼 자리로 바로 옮긴다.
   * @param app 누른 버튼의 앱
   * @param event 누르기 이벤트
   */
  function startAppDrag(app: WindowApp, event: ReactPointerEvent<HTMLButtonElement>): void {
    isDraggedRef.current = false;
    if (device === 'mobile' || !taskbarPins.includes(app)) {
      return;
    }
    startPointerDrag(event, {
      onStart: (start, point) => {
        isDraggingRef.current = true;
        setDraggingApp(app);
        isDraggedRef.current = true;
        hover.cancel();
        setPreview(null);
        const button = findAppButton(containerRef.current, app);
        if (button !== null) {
          reorderMotion.startDrag(button, start, point);
        }
      },
      onMove: (point) => {
        reorderMotion.moveDrag(point);
        const { taskbarPins: pins, moveTaskbarPin } = useWorkspaceStore.getState();
        const target = findTaskbarAppAt(containerRef.current, pins, point.x, point.y);
        const index = target === null ? -1 : pins.indexOf(target);
        if (target !== app && index !== -1) {
          moveTaskbarPin(app, index);
        }
      },
      onDrop: () => {
        isDraggingRef.current = false;
        setDraggingApp(null);
        reorderMotion.endDrag();
      },
      onCancel: () => {
        isDraggingRef.current = false;
        setDraggingApp(null);
        reorderMotion.endDrag();
      },
    });
  }

  /**
   * 미리보기를 고르면 그 창을 맨 앞으로 가져오고 목록을 닫는다.
   * @param id 창 id
   */
  function handlePreviewSelect(id: string): void {
    restore(id);
    setPreview(null);
  }

  /**
   * 미리보기의 닫기 버튼을 누르면 그 창을 닫는다. 목록은 남은 창으로 그대로 둔다.
   * @param id 창 id
   */
  function handlePreviewClose(id: string): void {
    const closed = useWindowStore.getState().windows[id];
    const isFocusInList = containerRef.current?.contains(document.activeElement) === true;
    close(id);
    if (closed !== undefined && getAppWindows(useWindowStore.getState(), closed.app).length === 0) {
      hover.cancel();
      setPreview(null);
      if (isFocusInList) {
        focusReturnAppRef.current = closed.app;
      }
    }
  }

  /**
   * 창이 화면에서 차지한 크기를 구한다. 최대화·스냅한 창은 그 자리 크기이고, 창을 늘 최대화해 보이는 모바일은 작업 영역 크기다.
   * @param target 열린 창
   * @returns 창 크기
   */
  function getShownWindowSize(target: OpenWindow): { width: number; height: number } {
    if (workArea === null) {
      return target.bounds;
    }
    return device === 'mobile' ? workArea : getWindowRect(target, workArea);
  }

  /**
   * 창 하나의 축소 화면을 그린다. 실제 창 조립을 같은 크기로 그린 뒤 미리보기 자리에 맞게 줄인다.
   * @param target 열린 창
   * @param box 축소 화면이 들어갈 자리 크기
   * @param box.width 자리 너비
   * @param box.height 자리 높이
   * @returns WindowThumbnail
   */
  function renderThumbnail(
    target: OpenWindow,
    box: { width: number; height: number },
  ): JSX.Element {
    const size = getShownWindowSize(target);
    return (
      <WindowThumbnail width={size.width} height={size.height} scale={getThumbnailScale(size, box)}>
        {renderWindow(target, {
          isInactive: false,
          placement: device === 'mobile' ? 'maximized' : target.placement,
          onMinimize: ignoreControl,
          onClose: ignoreControl,
        })}
      </WindowThumbnail>
    );
  }

  /**
   * 앱 버튼 하나와 그 창 미리보기 목록을 그린다.
   * @param app 앱
   * @returns TaskbarAppItem
   */
  function renderAppButton(app: WindowApp): JSX.Element {
    /**
     * 앱 버튼을 누르면 할 일을 한다.
     * @param event 누르기 이벤트. 키보드로 누른 클릭은 `detail`이 0이다
     */
    function handleButtonClick(event: ReactMouseEvent): void {
      handleAppClick(app, event.detail === 0);
    }
    /**
     * 포인터가 버튼이나 미리보기에 들어오면 창이 있는 앱일 때 열기를 기다린다.
     * @param event 포인터 이벤트
     */
    function handlePointerEnter(event: ReactPointerEvent): void {
      if (
        menuApp === null &&
        !isDraggingRef.current &&
        getAppWindows(useWindowStore.getState(), app).length > 0
      ) {
        hover.handlePointerEnter(app, event);
      }
    }
    /**
     * 버튼 위에서 포인터를 누르면 끌어 순서 바꾸기를 시작한다.
     * @param event 포인터 이벤트
     */
    function handleButtonPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
      startAppDrag(app, event);
    }
    /**
     * 우클릭 메뉴가 열리거나 닫히려 하면 알린다.
     * @param isOpen 열리려는지
     */
    function handleButtonMenuOpenChange(isOpen: boolean): void {
      handleMenuOpenChange(app, isOpen);
    }
    const appWindows = getAppWindows(state, app);
    const menuItems = getAppMenuEntries({
      app,
      isPinned: taskbarPins.includes(app),
      windowCount: appWindows.length,
      jumpList: getAppJumpList(app),
      onAction: (action) => {
        handleMenuAction(app, action);
      },
    });
    const isPreviewOpen = openPreviewApp === app;
    const isMobile = device === 'mobile';
    // 카드 너비는 창 비율을 따르고, 축소 화면 자리는 그 카드 너비에서 안쪽 여백을 뺀 너비다.
    // 모바일은 목록이 화면 폭을 넘치면 목록을 화면 폭에 맞추고 카드를 같은 너비로 줄인다.
    const aspectRatios = appWindows.map((target) =>
      getWindowAspectRatio(getShownWindowSize(target)),
    );
    const mobileLayout =
      isMobile && workArea !== null
        ? getMobilePreviewLayout(workArea.width, aspectRatios)
        : undefined;
    const previews = appWindows.map(
      /**
       * 창 하나의 미리보기 데이터를 만든다.
       * @param target 열린 창
       * @param index 창 순서
       * @returns 미리보기 데이터
       */
      (target, index) => {
        const aspectRatio = aspectRatios[index] ?? getWindowAspectRatio(target.bounds);
        const cardWidth = mobileLayout?.cardWidth ?? getPreviewCardWidth(aspectRatio);
        return {
          id: target.id,
          title: getWindowTitle(target),
          aspectRatio,
          thumbnail: renderThumbnail(target, getPreviewThumbnailBox(cardWidth)),
        };
      },
    );
    return (
      <TaskbarAppItem
        key={app}
        app={app}
        indicator={getTaskbarAppIndicator(state, app)}
        isOpen={isPreviewOpen}
        onButtonClick={handleButtonClick}
        onButtonPointerDown={handleButtonPointerDown}
        menuItems={menuItems}
        isMenuOpen={menuApp === app}
        onMenuOpenChange={handleButtonMenuOpenChange}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={hover.handlePointerLeave}
        isDragging={draggingApp === app}
        isCentered={isMobile}
        isMenuAtPointer={isMobile}
        previews={
          isPreviewOpen ? (
            <TaskbarWindowPreviewList
              app={app}
              windows={previews}
              listWidth={mobileLayout?.listWidth}
              cardWidth={mobileLayout?.cardWidth}
              onSelect={handlePreviewSelect}
              onClose={handlePreviewClose}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <div ref={containerRef} {...rovingProps} className="contents">
      {apps.map(renderAppButton)}
    </div>
  );
}

/** 축소 화면 안의 창은 조작할 수 없어(`inert`) 창 버튼 동작을 비워 둔다. */
function ignoreControl(): void {}

/**
 * 앱 버튼 요소를 찾는다.
 * @param container 앱 버튼들을 담은 요소
 * @param app 앱
 * @returns 앱 버튼. 없으면 null
 */
function findAppButton(container: HTMLElement | null, app: WindowApp): HTMLElement | null {
  return container?.querySelector<HTMLElement>(`[data-taskbar-app="${app}"]`) ?? null;
}
