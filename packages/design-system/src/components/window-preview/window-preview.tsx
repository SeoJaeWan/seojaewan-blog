import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, CSSProperties, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { IconButton } from '../icon-button/icon-button';
import { WindowTitle } from '../window-title/window-title';

type WindowPreviewBaseProps = Omit<ComponentProps<'div'>, 'children' | 'title' | 'onSelect'> & {
  appIcon: ReactNode;
  title?: string;
  closeLabel?: string;
  onSelect?: (event: MouseEvent<HTMLElement>) => void;
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
};

type WindowPreviewProps = WindowPreviewBaseProps &
  (
    | {
        variant?: 'default';
        thumbnail?: ReactNode;
        aspectRatio?: number;
      }
    | {
        variant: 'title';
        thumbnail?: never;
        aspectRatio?: never;
      }
  );

// 누르는 영역(앱 아이콘·제목·축소 화면)의 배치다. 포커스 선은 카드 테두리에 그리므로 누르는 영역의 기본 외곽선은 끈다.
const PRESS_AREA_CLASS_NAME = 'flex flex-col gap-spacing-sm outline-none';

/**
 * 창 미리보기(피그마 WindowPreview)를 그린다. 작업 표시줄 창 미리보기와 Snap Assist에 쓴다.
 * - Default: 축소 화면과 제목으로 된 카드다. 축소 화면 높이는 고정이고, 카드 너비는 축소 화면 높이 × 창 비율 + 좌우 여백이며
 *   최대 size/window-preview/width(208)다. 창 비율(aspectRatio)을 받지 않으면 최대 너비로 그린다.
 *   축소 화면 자리(thumbnail)는 비워 두어 조립이 채운다. 닫기 버튼은 Hover(키보드는 포커스)일 때만 머리글에 나온다.
 * - Title: 축소 화면 없이 앱 아이콘·제목·닫기 버튼만 있는 제목 줄이다(모바일 미리보기 목록). 너비는 갖지 않고 쓰는 곳이 정한다.
 *   터치로 쓰므로 닫기 버튼은 늘 보인다.
 * Rest·Hover 모양은 CSS hover로 바꾼다.
 * 카드(바깥 상자) 안에 누르는 영역(앱 아이콘·제목·축소 화면)과 닫기 버튼을 형제로 둔다. 버튼 안에 버튼을 둘 수 없기 때문이다.
 * 바깥 상자가 생김새·크기와 그 밖의 속성(`onKeyDown`, `data-*` 등)을 갖고, `onSelect`를 주면 누르는 영역만 Base UI Button(버튼 역할)이 된다.
 * 닫기 버튼은 머리글 오른쪽의 닫기 버튼 자리에 겹쳐 놓는다. 닫기 버튼은 마우스 전용이다. 카드 묶음은 Tab 한 번이기 때문이다.
 * 키보드는 누르는 영역에서 Delete로 닫는다(쓰는 곳이 바깥 상자의 `onKeyDown`으로 받는다). 눌러도 포커스를 가져오지 않는다.
 * 축소 화면은 그림이라 보조 기술에 숨겨, 카드 이름은 창 제목만 된다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @codocs [[접근성:Tab]]
 * @codocs [[접근성:역할]]
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param props 컴포넌트 속성
 * @param props.variant 피그마 Variant. `default`는 축소 화면 카드, `title`은 제목 줄이다
 * @param props.appIcon 피그마 WindowTitle의 노출 속성 App icon. 앱마다 다른 아이콘이라 꼭 넘긴다
 * @param props.title 피그마 WindowTitle의 노출 속성 Title. 창 제목 글자다
 * @param props.thumbnail 피그마 Thumbnail 슬롯(Default만). 실제 창 컴포넌트를 CSS scale로 줄여 넣는다
 * @param props.closeLabel 닫기 버튼의 이름. 버튼은 마우스 전용이라 보조 기술에는 드러나지 않는다
 * @param props.aspectRatio 창 비율(너비 ÷ 높이, Default만). 카드 너비를 이 비율로 정한다. 창 비율은 쓰는 곳이 구한다
 * @param props.onSelect 누르는 영역을 눌렀을 때 부른다. 주면 누르는 영역이 버튼 역할을 하고 Delete로 닫을 수 있다고 알린다
 * @param props.onClose 닫기 버튼을 눌렀을 때 부른다. 카드의 onSelect·onClick은 부르지 않는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.style 덧붙일 인라인 스타일. width를 주면 aspectRatio로 정한 너비보다 앞선다
 */
export function WindowPreview({
  variant = 'default',
  appIcon,
  title,
  thumbnail,
  closeLabel = '창 닫기',
  aspectRatio,
  onSelect: handleSelect,
  onClose,
  className,
  style,
  ...divProps
}: WindowPreviewProps): JSX.Element {
  const isTitle = variant === 'title';
  // 카드 너비 = 축소 화면 높이 × 창 비율 + 좌우 여백. 최대 너비는 클래스(max-w)가 막는다.
  const ratioStyle: CSSProperties | undefined =
    isTitle || aspectRatio === undefined
      ? undefined
      : {
          width: `calc(var(--size-window-preview-thumbnail-height) * ${String(aspectRatio)} + var(--spacing-sm) * 2)`,
        };
  // Default의 닫기 버튼과 그 자리는 Hover(키보드는 누르는 영역 포커스)일 때만 보인다.
  const closeVisibility =
    !isTitle && 'hidden group-hover:inline-flex group-has-focus-visible:inline-flex';
  const pressContent = (
    <>
      <div className="flex h-size-control-height items-center gap-spacing-sm overflow-clip pl-spacing-xs">
        <WindowTitle
          variant="preview"
          appIcon={appIcon}
          title={title}
          className="min-w-size-none flex-flex-fill"
        />
        {/* 닫기 버튼이 겹쳐 놓이는 자리다. 닫기 버튼이 보일 때 제목이 이만큼 줄어든다. */}
        <span
          aria-hidden
          className={cn('size-size-control-height shrink-shrink-none', closeVisibility)}
        />
      </div>
      {/* 축소 화면 자리에는 바탕·선·둥글기가 없다. 카드 너비가 창 비율을 따라 받은 그림이 자리를 채운다. */}
      {!isTitle && (
        <div
          aria-hidden
          className="flex h-size-window-preview-thumbnail-height flex-col items-center justify-center overflow-clip"
        >
          {thumbnail}
        </div>
      )}
    </>
  );
  return (
    <div
      {...divProps}
      style={{ ...ratioStyle, ...style }}
      className={cn(
        'group relative flex flex-col rounded-radius-control p-spacing-sm select-none',
        !isTitle && 'w-size-window-preview-width max-w-size-window-preview-width',
        'bg-color-white-0 hover:bg-color-white-70',
        // 포커스는 누르는 영역이 받고, 포커스 선은 카드 테두리에 그린다.
        'has-focus-visible:outline-stroke-width-focus-outer has-focus-visible:outline-color-black-89 has-focus-visible:outline-solid',
        'motion-control-state',
        className,
      )}
    >
      {handleSelect === undefined ? (
        <div className={PRESS_AREA_CLASS_NAME}>{pressContent}</div>
      ) : (
        <BaseButton
          nativeButton={false}
          render={<div />}
          onClick={handleSelect}
          // @codocs [[접근성:역할]]
          // 카드에서 Delete로 닫을 수 있다고 알린다(키 처리는 쓰는 곳).
          aria-keyshortcuts="Delete"
          className={PRESS_AREA_CLASS_NAME}
        >
          {pressContent}
        </BaseButton>
      )}
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
        className={cn('absolute top-spacing-sm right-spacing-sm', closeVisibility)}
      />
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
