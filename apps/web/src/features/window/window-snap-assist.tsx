import type { JSX, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { SnapAssist } from './snap-assist';
import { getThumbnailScale } from './window-geometry';
import type { OpenWindow, SnapZone, WindowWorkArea } from './window-rules';
import { getSnapZoneRect, getWindowRect } from './window-rules';
import { WindowThumbnail } from './window-thumbnail';
import type { RenderWindow } from './window-view';

/** Snap Assist 축소 화면 자리(WindowPreview Thumbnail, 208 너비에서 안쪽 여백을 뺀 192×108) */
const THUMBNAIL_BOX = { width: 192, height: 108 } as const;

type WindowSnapAssistProps = {
  /** 채울 남은 칸 */
  zone: SnapZone;
  /** 남은 칸에 제안할 다른 창들 */
  windows: readonly OpenWindow[];
  /** 작업 영역 크기 */
  workArea: WindowWorkArea;
  /** 쌓는 차례. 모든 창보다 위다 */
  zIndex: number;
  /** 앱 창을 그린다. 축소 화면에 쓴다 */
  renderWindow: RenderWindow;
  /** 창 제목을 정한다 */
  getWindowTitle: (window: OpenWindow) => string;
  /** 창 앱 아이콘(16px)을 그린다 */
  renderWindowIcon: (window: OpenWindow) => ReactNode;
  /** 제안 창을 골랐을 때 */
  onSelect: (id: string) => void;
  /** 제안 카드의 닫기 버튼을 눌렀을 때 */
  onCloseWindow: (id: string) => void;
  /** Esc나 빈 곳을 눌러 제안을 닫을 때 */
  onDismiss: () => void;
};

/**
 * 창 하나를 스냅한 뒤 남은 칸 자리에 Snap Assist를 띄운다. 제안 카드는 실제 창 조립을 `WindowThumbnail` 비율로 줄여 보여 준다.
 * 카드를 고르면 그 창이 남은 칸을 채우고, Esc나 카드 밖(빈 곳)을 누르면 닫는다.
 * @codocs [[창 동작:스냅]]
 * @param props
 */
export function WindowSnapAssist(props: WindowSnapAssistProps): JSX.Element {
  const {
    zone,
    windows,
    workArea,
    zIndex,
    renderWindow,
    getWindowTitle,
    renderWindowIcon,
    onSelect: handleSelect,
    onCloseWindow: handleCloseWindow,
    onDismiss,
  } = props;
  const rect = getSnapZoneRect(zone, workArea);
  const dismissRef = useRef(onDismiss);

  useEffect(
    /** 최신 닫기 함수를 기억한다. 문서 이벤트를 다시 걸지 않으려는 것이다. */
    () => {
      dismissRef.current = onDismiss;
    },
  );

  useEffect(
    /** 떠 있는 동안 Esc와 카드 밖 누르기를 받아 닫는다. */
    () => {
      /**
       * 제안 카드가 아닌 곳을 누르면 닫는다.
       * @param event 누르기 이벤트
       */
      function handleDocumentPointerDown(event: PointerEvent): void {
        if (
          event.target instanceof Element &&
          event.target.closest('[data-snap-assist-suggestion]') !== null
        ) {
          return;
        }
        dismissRef.current();
      }
      /**
       * Esc를 누르면 닫는다.
       * @param event 키 이벤트
       */
      function handleDocumentKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
          dismissRef.current();
        }
      }
      document.addEventListener('pointerdown', handleDocumentPointerDown);
      document.addEventListener('keydown', handleDocumentKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handleDocumentPointerDown);
        document.removeEventListener('keydown', handleDocumentKeyDown);
      };
    },
    [],
  );

  return (
    <div
      role="dialog"
      aria-label="Snap Assist"
      className="pointer-events-auto absolute flex"
      style={{ zIndex, left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    >
      <SnapAssist
        className="size-full"
        onSelect={handleSelect}
        onClose={handleCloseWindow}
        suggestions={windows.map(
          /**
           * 제안 창 하나의 카드 데이터를 만든다.
           * @param target 열린 창
           * @returns 제안 데이터
           */
          (target) => {
            const size = getWindowRect(target, workArea);
            return {
              id: target.id,
              appIcon: renderWindowIcon(target),
              title: getWindowTitle(target),
              thumbnail: (
                <WindowThumbnail
                  width={size.width}
                  height={size.height}
                  scale={getThumbnailScale(size, THUMBNAIL_BOX)}
                >
                  {renderWindow(target, {
                    inactive: false,
                    placement: target.placement,
                    onMinimize: ignoreControl,
                    onClose: ignoreControl,
                    className: 'size-full',
                  })}
                </WindowThumbnail>
              ),
            };
          },
        )}
      />
    </div>
  );
}

/** 축소 화면 안의 창은 조작할 수 없어(`inert`) 창 버튼 동작을 비워 둔다. */
function ignoreControl(): void {}
