import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';

import { TaskbarAppPreview } from '@/features/taskbar/components/taskbar-app-preview/taskbar-app-preview';
import { TaskbarWindowPreviewList } from '@/features/taskbar/components/taskbar-window-preview-list/taskbar-window-preview-list';
import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { useOpenApp } from '@/shared/hooks/use-open-app/use-open-app';
import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { getThumbnailScale } from '@/shared/utils/window-geometry/window-geometry';
import type { OpenWindow, RenderWindow, WindowApp } from '@/shared/utils/window-rules/window-rules';
import {
  getAppWindows,
  getTaskbarAppAction,
  getTaskbarAppIndicator,
  getWindowRect,
} from '@/shared/utils/window-rules/window-rules';

/** 작업 표시줄에 처음 고정된 앱 */
const PINNED_APPS = ['file-explorer', 'chrome'] as const;

/** 창 미리보기 축소 화면 자리(WindowPreview Thumbnail, 208 너비에서 안쪽 여백을 뺀 192×108) */
const PREVIEW_THUMBNAIL_BOX = { width: 192, height: 108 } as const;

export type TaskbarAppsLayerProps = {
  /** 앱 창을 그린다. 미리보기 축소 화면 안에 쓴다. 앱마다 다른 창 조립은 쓰는 곳(앱 등록표)이 고른다 */
  renderWindow: RenderWindow;
  /** 창 제목을 정한다. 미리보기 제목이 된다 */
  getWindowTitle: (window: OpenWindow) => string;
};

/**
 * 작업 표시줄의 앱 버튼들을 그리고 창 저장소에 잇는 층이다.
 * - 아래 표시는 맨 앞 창이 이 앱이면 active, 열린 창이 있으면 running이다.
 * - 버튼을 누르면 열린 창 수와 순서에 따라 새로 열기, 최소화, 복원, 창 미리보기 목록 열기 가운데 하나를 한다.
 * - 미리보기 목록은 실제 창을 `WindowThumbnail`로 줄여 보여 주고, 고르면 그 창을 맨 앞으로, 닫기를 누르면 그 창을 닫는다.
 *   바깥을 누르거나 Esc를 누르면 닫힌다. 축소 화면 안의 창 내용과 제목은 앱을 아는 쓰는 곳이 `renderWindow`·`getWindowTitle`로 넘긴다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param props
 * @returns 앱 버튼들
 */
export function TaskbarAppsLayer(props: TaskbarAppsLayerProps): JSX.Element {
  const { renderWindow, getWindowTitle } = props;
  const windows = useWindowStore((state) => state.windows);
  const order = useWindowStore((state) => state.order);
  const minimize = useWindowStore((state) => state.minimize);
  const restore = useWindowStore((state) => state.restore);
  const close = useWindowStore((state) => state.close);
  const openApp = useOpenApp();
  const device = useDevice();
  const workArea = useWorkArea();
  const [previewApp, setPreviewApp] = useState<WindowApp | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const state = { windows, order, lastSerial: 0 };
  // 창을 모두 닫으면 목록도 닫힌다.
  const openPreviewApp =
    previewApp !== null && getAppWindows(state, previewApp).length > 0 ? previewApp : null;

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
        setPreviewApp(null);
      }
      /**
       * Esc를 누르면 목록을 닫는다.
       * @param event 키 이벤트
       */
      function handleDocumentKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
          setPreviewApp(null);
        }
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
   */
  function handleAppClick(app: WindowApp): void {
    const action = getTaskbarAppAction(useWindowStore.getState(), app);
    if (action.type === 'preview') {
      setPreviewApp(openPreviewApp === app ? null : app);
      return;
    }
    setPreviewApp(null);
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
   * 미리보기를 고르면 그 창을 맨 앞으로 가져오고 목록을 닫는다.
   * @param id 창 id
   */
  function handlePreviewSelect(id: string): void {
    restore(id);
    setPreviewApp(null);
  }

  /**
   * 미리보기의 닫기 버튼을 누르면 그 창을 닫는다. 목록은 남은 창으로 그대로 둔다.
   * @param id 창 id
   */
  function handlePreviewClose(id: string): void {
    close(id);
  }

  /**
   * 창 하나의 축소 화면을 그린다. 실제 창 조립을 같은 크기로 그린 뒤 미리보기 자리에 맞게 줄인다.
   * @param target 열린 창
   * @returns WindowThumbnail
   */
  function renderThumbnail(target: OpenWindow): JSX.Element {
    // 최대화·스냅한 창은 화면에서 차지한 크기 그대로 줄인다.
    const size = workArea === null ? target.bounds : getWindowRect(target, workArea);
    return (
      <WindowThumbnail
        width={size.width}
        height={size.height}
        scale={getThumbnailScale(size, PREVIEW_THUMBNAIL_BOX)}
      >
        {renderWindow(target, {
          inactive: false,
          placement: device === 'mobile' ? 'maximized' : target.placement,
          onMinimize: ignoreControl,
          onClose: ignoreControl,
          className: 'size-full',
        })}
      </WindowThumbnail>
    );
  }

  /**
   * 앱 버튼 하나와 그 창 미리보기 목록을 그린다.
   * @param app 앱
   * @returns TaskbarAppPreview
   */
  function renderAppButton(app: WindowApp): JSX.Element {
    /** 앱 버튼을 누르면 할 일을 한다. */
    function handleButtonClick(): void {
      handleAppClick(app);
    }
    const isPreviewOpen = openPreviewApp === app;
    const previews = getAppWindows(state, app).map(
      /**
       * 창 하나의 미리보기 데이터를 만든다.
       * @param target 열린 창
       * @returns 미리보기 데이터
       */
      (target) => ({
        id: target.id,
        title: getWindowTitle(target),
        thumbnail: renderThumbnail(target),
      }),
    );
    return (
      <TaskbarAppPreview
        key={app}
        app={app}
        indicator={getTaskbarAppIndicator(state, app)}
        open={isPreviewOpen}
        onButtonClick={handleButtonClick}
        previews={
          isPreviewOpen ? (
            <TaskbarWindowPreviewList
              app={app}
              windows={previews}
              onSelect={handlePreviewSelect}
              onClose={handlePreviewClose}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <div ref={containerRef} className="contents">
      {PINNED_APPS.map(renderAppButton)}
    </div>
  );
}

/** 축소 화면 안의 창은 조작할 수 없어(`inert`) 창 버튼 동작을 비워 둔다. */
function ignoreControl(): void {}
