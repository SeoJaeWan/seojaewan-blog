import { type ComponentProps, type JSX, type ReactNode, useId, useState } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type ToggleProps = Omit<ComponentProps<'div'>, 'children' | 'title' | 'defaultValue'> & {
  /** 피그마 `title` 글자. 꺾쇠 옆에 보이는 토글 제목이다 */
  title?: ReactNode;
  /** 피그마 `Content` 슬롯. 펼쳤을 때만 그려지는 내용 블록을 넣는다 */
  children?: ReactNode;
  /** 피그마 State(Expanded/Collapsed). 주면 제어 모드이고, 상태는 쓰는 곳이 정한다 */
  isExpanded?: boolean;
  /** 비제어 모드의 처음 펼침 상태. `isExpanded`를 주면 무시한다 */
  defaultExpanded?: boolean;
  /** 제목을 눌러 펼침 상태가 바뀔 때 새 상태와 함께 부른다 */
  onExpandedChange?: (isExpanded: boolean) => void;
};

/**
 * 글 본문의 Notion 토글(피그마 Toggle)을 그린다. 제목은 `title`, 펼쳤을 때 보이는 내용은 `children` 슬롯으로 채운다.
 * 펼침 상태는 `isExpanded`로 제어하거나, 주지 않으면 `defaultExpanded`에서 시작해 스스로 바꾼다.
 * 제목 줄은 `aria-expanded`를 가진 버튼이고, 접힌 동안은 내용을 그리지 않는다(피그마 Collapsed 변형).
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 꺾쇠는 쓰는 곳마다 바뀌지 않는 기능 아이콘이라 속성으로 열지 않고 고정한다(@codocs [[디자인 시스템:아이콘 자리]]).
 * @codocs [[Notion 블록:모양]]
 * @param props
 */
export function Toggle(props: ToggleProps): JSX.Element {
  const {
    title = '제목',
    children,
    isExpanded: isControlledExpanded,
    defaultExpanded: isDefaultExpanded = false,
    onExpandedChange,
    className,
    ...divProps
  } = props;
  const [isUncontrolledExpanded, setIsUncontrolledExpanded] = useState(isDefaultExpanded);
  const contentId = useId();
  const isExpanded = isControlledExpanded ?? isUncontrolledExpanded;

  /** 제목 줄을 눌러 펼침 상태를 바꾼다. 제어 모드에서는 알리기만 하고 상태는 쓰는 곳이 바꾼다 */
  function handleHeaderClick(): void {
    const isNextExpanded = !isExpanded;
    if (isControlledExpanded === undefined) {
      setIsUncontrolledExpanded(isNextExpanded);
    }
    onExpandedChange?.(isNextExpanded);
  }

  return (
    <div {...divProps} className={cn('flex flex-col items-start gap-spacing-xs', className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? contentId : undefined}
        onClick={handleHeaderClick}
        className="flex min-h-size-post-block-icon-box w-full cursor-pointer items-start gap-spacing-none rounded-radius-control p-spacing-none text-left outline-none focus-visible:outline-stroke-width-focus-outer focus-visible:outline-color-black-89 focus-visible:outline-solid"
      >
        <span className="flex size-size-post-block-icon-box shrink-shrink-none items-center justify-center">
          <Asset
            name="icons/ic_fluent_chevron_right_16_regular.svg"
            className={cn(
              'size-size-icon-sm shrink-shrink-none text-color-black-89',
              isExpanded && 'rotate-rotate-quarter',
            )}
          />
        </span>
        <span className="min-w-size-none flex-flex-fill type-body-large text-color-black-89">
          {title}
        </span>
      </button>
      {isExpanded ? (
        // 피그마 Content 슬롯의 배치다. 꺾쇠 자리(spacing/2xl)만큼 들여 쓰고 블록 사이를 spacing/sm로 띄운다.
        // 슬롯 글자는 글 본문 글자(Body Large)다. 제목·목록처럼 다른 글자 블록은 그 블록이 글자 스타일을 갖는다.
        <div
          id={contentId}
          className="flex w-full min-w-size-none flex-col gap-spacing-sm pl-spacing-2xl type-body-large text-color-black-89"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
