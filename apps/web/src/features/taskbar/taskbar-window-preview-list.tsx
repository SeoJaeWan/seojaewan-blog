import type { JSX, KeyboardEvent, ReactNode } from 'react';

import { TaskbarPreviewList, WindowPreview } from '@seojaewan/design-system';

import type { TaskbarAppId } from './taskbar-app';
import { renderTaskbarAppIcon } from './taskbar-app';

/** 창 미리보기 목록의 창 하나 */
export type TaskbarWindowPreview = {
  /** 목록 안에서 창을 가리키는 값(창 id) */
  id: string;
  /** 창 제목 */
  title: string;
  /** 창 축소 화면. 실제 창 조립을 `WindowThumbnail`로 줄여 넣는다 */
  thumbnail: ReactNode;
};

type TaskbarWindowPreviewListProps = {
  /** 창들이 속한 앱. 미리보기 머리글의 앱 아이콘을 정한다 */
  app: TaskbarAppId;
  /** 그 앱의 열린 창들 */
  windows: readonly TaskbarWindowPreview[];
  /** 미리보기를 눌렀을 때 부른다. 그 창을 맨 앞으로 가져온다. 주면 미리보기가 버튼 역할을 한다 */
  onSelect?: (id: string) => void;
  /** 미리보기의 닫기 버튼을 눌렀을 때 부른다. 그 창을 닫는다 */
  onClose?: (id: string) => void;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * 작업 표시줄 앱 버튼 위에 뜨는 창 미리보기 목록(피그마 조립 `Taskbar/PreviewList`)을 그린다.
 * 너비는 창 개수에 맞춘다(피그마 HUG). TaskbarPreviewList 판에 창마다 WindowPreview 카드(앱 아이콘, 제목, 축소 화면)를 가로로 늘어놓는다.
 * 미리보기를 누르면(`onSelect`) 그 창을 맨 앞으로 가져오고, 닫기 버튼을 누르면(`onClose`) 그 창을 닫는다. 동작은 쓰는 곳이 넣는다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param props
 */
export function TaskbarWindowPreviewList(props: TaskbarWindowPreviewListProps): JSX.Element {
  const { app, windows, onSelect, onClose, className } = props;
  return (
    <TaskbarPreviewList className={className === undefined ? 'w-max' : `w-max ${className}`}>
      {windows.map(
        /**
         * 창 미리보기 카드 하나를 그린다.
         * @param item 창
         * @returns WindowPreview
         */
        (item) => {
          /** 미리보기를 누르면 쓰는 곳에 알린다. */
          function handleClick(): void {
            onSelect?.(item.id);
          }
          /**
           * Enter·Space를 누르면 미리보기를 누른 것으로 본다.
           * @param event 키 이벤트
           */
          function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
            if (
              event.target === event.currentTarget &&
              (event.key === 'Enter' || event.key === ' ')
            ) {
              event.preventDefault();
              onSelect?.(item.id);
            }
          }
          /** 닫기 버튼을 누르면 쓰는 곳에 알린다. */
          function handleClose(): void {
            onClose?.(item.id);
          }
          const isSelectable = onSelect !== undefined;
          const handleSelectClick = isSelectable ? handleClick : undefined;
          const handleSelectKeyDown = isSelectable ? handleKeyDown : undefined;
          return (
            <WindowPreview
              key={item.id}
              role={isSelectable ? 'button' : undefined}
              tabIndex={isSelectable ? 0 : undefined}
              aria-label={isSelectable ? item.title : undefined}
              onClick={handleSelectClick}
              onKeyDown={handleSelectKeyDown}
              onClose={handleClose}
              appIcon={renderTaskbarAppIcon(app)}
              title={item.title}
              thumbnail={item.thumbnail}
              className="shrink-0"
            />
          );
        },
      )}
    </TaskbarPreviewList>
  );
}
