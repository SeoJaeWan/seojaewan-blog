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
  /** 닫기 버튼의 접근성 이름 */
  closeLabel?: string;
  /** 닫기 버튼을 눌렀을 때 부른다. 카드 자체의 onClick은 부르지 않는다 */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * 창 축소 화면과 제목으로 된 창 미리보기 카드(피그마 WindowPreview)를 그린다. 작업 표시줄 창 미리보기와 Snap Assist에 쓴다.
 * 너비는 Windows가 정한 208로 고정하고, 축소 화면 자리(thumbnail)는 비워 두어 조립이 채운다.
 * Rest·Hover 모양은 CSS hover로 바꾸고, 닫기 버튼은 Hover일 때만 머리글에 나온다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:아이콘 자리]]
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
        'group flex w-208 flex-col gap-8 rounded-control p-8 select-none',
        'bg-subtle-fill-transparent hover:bg-subtle-fill-secondary',
        'transition-colors duration-faster ease-fade',
        className,
      )}
    >
      <div className="flex h-control-height items-center gap-8 overflow-clip pl-4">
        <WindowTitle kind="preview" appIcon={appIcon} title={title} className="min-w-px flex-1" />
        <IconButton
          variant="subtle"
          label={closeLabel}
          icon="icons/ic_fluent_dismiss_20_regular.svg"
          onClick={(event) => {
            event.stopPropagation();
            onClose?.(event);
          }}
          className="hidden shrink-0 group-focus-within:inline-flex group-hover:inline-flex"
        />
      </div>
      {/* 피그마 안쪽 선은 레이아웃에 들어가지 않아, CSS border 대신 내용 위에 겹친 고리(inner-border)로 그린다. */}
      <div className="inner-border-card-stroke-default relative isolate flex h-108 flex-col items-center justify-center overflow-clip rounded-control bg-solid-background-fill-base inner-border-w-default">
        {thumbnail}
      </div>
    </div>
  );
}
