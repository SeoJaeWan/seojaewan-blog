import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';
import { WindowTitle } from '../window-title/window-title';

type WindowPreviewProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 WindowTitle의 노출 속성 App icon. 앱마다 다른 아이콘이라 꼭 넘긴다 */
  appIcon: ReactNode;
  /** 피그마 WindowTitle의 노출 속성 Title. 창 제목 글자다 */
  title?: string;
  /** 피그마 Thumbnail 슬롯. 실제 창 컴포넌트를 CSS scale로 줄여 넣는다 */
  thumbnail?: ReactNode;
  /** 닫기 버튼의 이름. 버튼은 마우스 전용이라 보조 기술에는 드러나지 않는다 */
  closeLabel?: string;
  /** 닫기 버튼을 눌렀을 때 부른다. 카드 자체의 onClick은 부르지 않는다 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 창 축소 화면과 제목으로 된 창 미리보기 카드(피그마 WindowPreview)를 그린다. 작업 표시줄 창 미리보기와 Snap Assist에 쓴다.
 * 너비는 Windows가 정한 208로 고정하고, 축소 화면 자리(thumbnail)는 비워 두어 조립이 채운다.
 * Rest·Hover 모양은 CSS hover로 바꾸고, 닫기 버튼은 Hover(키보드는 포커스)일 때만 머리글에 나온다.
 * 카드는 쓰는 곳이 버튼으로 쓸 수 있어 닫기 버튼은 마우스 전용이다. 버튼 안에 버튼을 둘 수 없고 카드 묶음은 Tab 한 번이기 때문이다. 키보드는 카드에서 Delete로 닫는다(쓰는 곳이 받는다).
 * 축소 화면은 그림이라 보조 기술에 숨겨, 카드 이름은 창 제목만 된다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @codocs [[접근성:Tab]]
 * @param props
 */
export function WindowPreview(props: WindowPreviewProps): JSX.Element {
  const {
    appIcon,
    title,
    thumbnail,
    closeLabel = '창 닫기',
    onClose,
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'group flex w-size-window-preview-width flex-col gap-spacing-sm rounded-radius-control p-spacing-sm select-none',
        'bg-color-white-0 hover:bg-color-black-4',
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
          variant="subtle"
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
      {/* 피그마 안쪽 선은 레이아웃에 들어가지 않아, CSS border 대신 내용 위에 겹친 고리(inner-border)로 그린다. */}
      <div
        aria-hidden
        className="inner-border-color-black-6 relative isolate flex h-size-window-preview-thumbnail-height flex-col items-center justify-center overflow-clip rounded-radius-control bg-color-gray-4 inner-border-w-stroke-width-default"
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
