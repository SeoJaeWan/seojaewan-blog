import type { ComponentProps, CSSProperties, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';
import { WindowTitle } from '../window-title/window-title';

type WindowPreviewProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  appIcon: ReactNode;
  title?: string;
  thumbnail?: ReactNode;
  closeLabel?: string;
  aspectRatio?: number;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 창 축소 화면과 제목으로 된 창 미리보기 카드(피그마 WindowPreview)를 그린다. 작업 표시줄 창 미리보기와 Snap Assist에 쓴다.
 * 축소 화면 높이는 고정이고, 카드 너비는 축소 화면 높이 × 창 비율 + 좌우 여백이며 최대 size/window-preview/width(208)다.
 * 창 비율(aspectRatio)을 받지 않으면 최대 너비로 그린다. 축소 화면 자리(thumbnail)는 비워 두어 조립이 채운다.
 * Rest·Hover 모양은 CSS hover로 바꾸고, 닫기 버튼은 Hover(키보드는 포커스)일 때만 머리글에 나온다.
 * 카드는 쓰는 곳이 버튼으로 쓸 수 있어 닫기 버튼은 마우스 전용이다. 버튼 안에 버튼을 둘 수 없고 카드 묶음은 Tab 한 번이기 때문이다. 키보드는 카드에서 Delete로 닫는다(쓰는 곳이 받는다).
 * 축소 화면은 그림이라 보조 기술에 숨겨, 카드 이름은 창 제목만 된다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @codocs [[접근성:Tab]]
 * @codocs [[작업 표시줄 검수:6. 미리보기 카드 폭과 축소 화면]]
 * @param props 컴포넌트 속성
 * @param props.appIcon 피그마 WindowTitle의 노출 속성 App icon. 앱마다 다른 아이콘이라 꼭 넘긴다
 * @param props.title 피그마 WindowTitle의 노출 속성 Title. 창 제목 글자다
 * @param props.thumbnail 피그마 Thumbnail 슬롯. 실제 창 컴포넌트를 CSS scale로 줄여 넣는다
 * @param props.closeLabel 닫기 버튼의 이름. 버튼은 마우스 전용이라 보조 기술에는 드러나지 않는다
 * @param props.aspectRatio 창 비율(너비 ÷ 높이). 카드 너비를 이 비율로 정한다. 창 비율은 쓰는 곳이 구한다
 * @param props.onClose 닫기 버튼을 눌렀을 때 부른다. 카드 자체의 onClick은 부르지 않는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.style 덧붙일 인라인 스타일. width를 주면 aspectRatio로 정한 너비보다 앞선다
 */
export function WindowPreview({
  appIcon,
  title,
  thumbnail,
  closeLabel = '창 닫기',
  aspectRatio,
  onClose,
  className,
  style,
  ...divProps
}: WindowPreviewProps): JSX.Element {
  // 카드 너비 = 축소 화면 높이 × 창 비율 + 좌우 여백. 최대 너비는 클래스(max-w)가 막는다.
  const ratioStyle: CSSProperties | undefined =
    aspectRatio === undefined
      ? undefined
      : {
          width: `calc(var(--size-window-preview-thumbnail-height) * ${String(aspectRatio)} + var(--spacing-sm) * 2)`,
        };
  return (
    <div
      {...divProps}
      style={{ ...ratioStyle, ...style }}
      className={cn(
        'group flex w-size-window-preview-width max-w-size-window-preview-width flex-col gap-spacing-sm rounded-radius-control p-spacing-sm select-none',
        'bg-color-white-0 hover:bg-color-white-70',
        'motion-control-state',
        className,
      )}
    >
      <div className="flex h-size-control-height items-center gap-spacing-sm overflow-clip pl-spacing-xs">
        <WindowTitle
          variant="preview"
          appIcon={appIcon}
          title={title}
          className="min-w-size-none flex-flex-fill"
        />
        <IconButton
          variant="close"
          label={closeLabel}
          icon="icons/ic_fluent_dismiss_20_regular.svg"
          aria-hidden
          tabIndex={-1}
          onMouseDown={handleCloseMouseDown}
          onClick={(event) => {
            event.stopPropagation();
            onClose?.(event);
          }}
          className="hidden shrink-shrink-none group-hover:inline-flex group-focus-visible:inline-flex"
        />
      </div>
      {/* 축소 화면 자리에는 바탕·선·둥글기가 없다. 카드 너비가 창 비율을 따라 받은 그림이 자리를 채운다. */}
      <div
        aria-hidden
        className="flex h-size-window-preview-thumbnail-height flex-col items-center justify-center overflow-clip"
      >
        {thumbnail}
      </div>
    </div>
  );
}

/**
 * 닫기 버튼을 눌러도 포커스를 옮기지 않는다. 버튼은 마우스 전용이고 곧 사라진다.
 * @param event 누르기 이벤트
 */
function handleCloseMouseDown(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}
