import { type JSX, type KeyboardEvent, type ReactNode, useRef } from 'react';

import { TaskbarPreviewList, WindowPreview } from '@seojaewan/design-system';

import { TaskbarAppIcon } from '@/features/taskbar/components/taskbar-app-icon/taskbar-app-icon';
import type { TaskbarAppId } from '@/features/taskbar/data/taskbar-apps/taskbar-apps';
import { useRovingFocus } from '@/shared/hooks/use-roving-focus/use-roving-focus';

/**
 * 창 미리보기 목록의 창 하나. id는 목록 안에서 창을 가리키는 값(창 id)이다. thumbnail은 창 축소 화면이며 실제 창 조립을 `WindowThumbnail`로 줄여 넣는다.
 * aspectRatio는 창이 화면에서 차지한 너비 ÷ 높이이고, 카드 너비가 이 비율을 따른다. 둘은 데스크톱 카드에만 쓰고 모바일 제목 줄은 쓰지 않는다.
 */
export type TaskbarWindowPreview = {
  id: string;
  title: string;
  thumbnail?: ReactNode;
  aspectRatio?: number;
};

type TaskbarWindowPreviewListProps = {
  app: TaskbarAppId;
  windows: readonly TaskbarWindowPreview[];
  onSelect?: (id: string) => void;
  onClose?: (id: string) => void;
  device?: 'desktop' | 'mobile';
  listWidth?: number;
  className?: string;
};

/**
 * 작업 표시줄 앱 버튼 위에 뜨는 창 미리보기 목록(피그마 조립 `Taskbar/PreviewList`)을 그린다.
 * 데스크톱은 너비를 카드들에 맞춘다(피그마 HUG). TaskbarPreviewList 판에 창마다 WindowPreview 카드(앱 아이콘, 제목, 축소 화면)를 가로로 늘어놓고, 카드 너비는 창 비율(`aspectRatio`)을 따른다.
 * 모바일은 축소 화면 없는 제목 줄(WindowPreview `variant="title"`)을 TaskbarPreviewList `device="mobile"` 판에 세로로 쌓고, 줄이 판 너비(`listWidth`)를 채운다.
 * 판 너비는 화면 폭으로 실행 중에 정해지는 값이라 인라인 스타일이다.
 * 미리보기를 누르면(`onSelect`) 그 창을 맨 앞으로 가져오고, 닫기 버튼이나 Delete로(`onClose`) 그 창을 닫는다. 동작은 쓰는 곳이 넣는다.
 * 카드의 누르는 영역(닫기 버튼과 형제)이 버튼 역할이고 목록은 Tab 한 번에 닿는다. 안에서 데스크톱 카드는 ←/→, 세로로 쌓인 모바일 제목 줄은 ↑/↓로 옮긴다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @codocs [[작업 표시줄:모바일]]
 * @codocs [[접근성:Tab]]
 * @codocs [[접근성:역할]]
 * @param props 컴포넌트 속성
 * @param props.app 창들이 속한 앱. 미리보기 머리글의 앱 아이콘을 정한다
 * @param props.windows 그 앱의 열린 창들
 * @param props.onSelect 미리보기를 눌렀을 때 부른다. 그 창을 맨 앞으로 가져온다. 주면 미리보기가 버튼 역할을 한다
 * @param props.onClose 미리보기의 닫기 버튼을 누르거나 미리보기에서 Delete를 눌렀을 때 부른다. 그 창을 닫는다
 * @param props.device 기기. `mobile`은 축소 화면 없는 제목 줄을 세로로 쌓는다
 * @param props.listWidth 목록 판의 너비(px). 모바일에서 화면 폭에 맞출 때 쓴다
 * @param props.className 바깥 배치 클래스
 */
export function TaskbarWindowPreviewList({
  app,
  windows,
  onSelect,
  onClose,
  device = 'desktop',
  listWidth,
  className,
}: TaskbarWindowPreviewListProps): JSX.Element {
  const isMobile = device === 'mobile';
  const listRef = useRef<HTMLDivElement>(null);
  const rovingProps = useRovingFocus(listRef, {
    orientation: isMobile ? 'vertical' : 'horizontal',
  });
  // 데스크톱 판은 카드들에 맞추고(HUG), 모바일 판은 쓰는 곳이 준 너비다.
  const widthClass = isMobile ? '' : 'w-max';
  return (
    <TaskbarPreviewList
      ref={listRef}
      {...rovingProps}
      device={device}
      className={className === undefined ? widthClass : `${widthClass} ${className}`}
      style={listWidth === undefined ? undefined : { width: listWidth }}
    >
      {windows.map(
        /**
         * 창 미리보기 카드(모바일은 제목 줄) 하나를 그린다.
         * @param item 창
         * @returns WindowPreview
         */
        (item) => {
          /** 미리보기를 누르면 쓰는 곳에 알린다. */
          function handleSelect(): void {
            onSelect?.(item.id);
          }
          /**
           * Delete를 누르면 그 창을 닫는다.
           * @param event 키 이벤트
           */
          function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
            if (event.key === 'Delete') {
              event.preventDefault();
              onClose?.(item.id);
            }
          }
          /** 닫기 버튼을 누르면 쓰는 곳에 알린다. */
          function handleClose(): void {
            onClose?.(item.id);
          }
          // onSelect를 받았을 때만 카드의 누르는 영역이 버튼이 되고 Delete를 받는다.
          const selectProps =
            onSelect === undefined ? {} : { onSelect: handleSelect, onKeyDown: handleKeyDown };
          return isMobile ? (
            <WindowPreview
              key={item.id}
              variant="title"
              {...selectProps}
              onClose={handleClose}
              appIcon={<TaskbarAppIcon app={app} />}
              title={item.title}
            />
          ) : (
            <WindowPreview
              key={item.id}
              {...selectProps}
              onClose={handleClose}
              appIcon={<TaskbarAppIcon app={app} />}
              title={item.title}
              thumbnail={item.thumbnail}
              aspectRatio={item.aspectRatio}
              className="shrink-shrink-none"
            />
          );
        },
      )}
    </TaskbarPreviewList>
  );
}
