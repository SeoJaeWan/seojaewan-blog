import type { JSX, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { WindowThumbnail } from '@/shared/components/window-thumbnail/window-thumbnail';
import {
  getPreviewCardWidth,
  getPreviewThumbnailBox,
  getThumbnailScale,
  getWindowAspectRatio,
} from '@/shared/utils/window-geometry/window-geometry';
import type {
  OpenWindow,
  RenderWindow,
  SnapZone,
  WindowWorkArea,
} from '@/shared/utils/window-rules/window-rules';
import { getSnapZoneRect, getWindowRect } from '@/shared/utils/window-rules/window-rules';

import { SnapAssist } from './components/snap-assist/snap-assist';

type WindowSnapAssistProps = {
  zone: SnapZone;
  windows: readonly OpenWindow[];
  workArea: WindowWorkArea;
  zIndex: number;
  renderWindow: RenderWindow;
  getWindowTitle: (window: OpenWindow) => string;
  renderWindowIcon: (window: OpenWindow) => ReactNode;
  onSelect: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onDismiss: () => void;
};

/**
 * 창 하나를 스냅한 뒤 남은 칸 자리에 Snap Assist를 띄운다. 제안 카드는 실제 창 조립을 `WindowThumbnail` 비율로 줄여 보여 준다.
 * 카드를 고르면 그 창이 남은 칸을 채우고, Esc나 카드 밖(빈 곳)을 누르면 닫는다. 뜨면 첫 카드로 포커스를 옮긴다.
 * @codocs [[스냅:Snap Assist]]
 * @codocs [[접근성:포커스]]
 * @param props 컴포넌트 속성
 * @param props.zone 채울 남은 칸
 * @param props.windows 남은 칸에 제안할 다른 창들
 * @param props.workArea 작업 영역 크기
 * @param props.zIndex 쌓는 차례. 모든 창보다 위다
 * @param props.renderWindow 앱 창을 그린다. 축소 화면에 쓴다
 * @param props.getWindowTitle 창 제목을 정한다
 * @param props.renderWindowIcon 창 앱 아이콘(16px)을 그린다
 * @param props.onSelect 제안 창을 골랐을 때
 * @param props.onCloseWindow 제안 카드의 닫기 버튼을 눌렀을 때
 * @param props.onDismiss Esc나 빈 곳을 눌러 제안을 닫을 때
 */
export function WindowSnapAssist({
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
}: WindowSnapAssistProps): JSX.Element {
  const rect = getSnapZoneRect(zone, workArea);
  const dismissRef = useRef(onDismiss);
  const assistRef = useRef<HTMLDivElement>(null);

  useEffect(
    /** 최신 닫기 함수를 기억한다. 문서 이벤트를 다시 걸지 않으려는 것이다. */
    () => {
      dismissRef.current = onDismiss;
    },
  );

  useEffect(
    /** 뜨면 첫 카드로 포커스를 옮긴다. */
    () => {
      assistRef.current?.querySelector<HTMLElement>('[data-snap-assist-suggestion]')?.focus();
    },
    [],
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
      ref={assistRef}
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
            // 카드 너비는 창 비율을 따르고, 축소 화면 자리는 그 카드 너비에서 안쪽 여백을 뺀 너비다.
            const size = getWindowRect(target, workArea);
            const aspectRatio = getWindowAspectRatio(size);
            const box = getPreviewThumbnailBox(getPreviewCardWidth(aspectRatio));
            return {
              id: target.id,
              appIcon: renderWindowIcon(target),
              title: getWindowTitle(target),
              aspectRatio,
              thumbnail: (
                <WindowThumbnail
                  width={size.width}
                  height={size.height}
                  scale={getThumbnailScale(size, box)}
                >
                  {renderWindow(target, {
                    isInactive: false,
                    placement: target.placement,
                    onMinimize: ignoreControl,
                    onClose: ignoreControl,
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
