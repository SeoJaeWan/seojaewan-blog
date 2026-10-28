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
 * @codocs [[Chrome:Notion 블록]]
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
    <div {...divProps} className={cn('flex flex-col items-start gap-4', className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? contentId : undefined}
        onClick={handleHeaderClick}
        className="flex min-h-24 w-full cursor-pointer items-start gap-0 rounded-control p-0 text-left outline-none focus-visible:outline-focus-outer focus-visible:outline-focus-stroke-outer focus-visible:outline-solid"
      >
        <span className="flex size-24 shrink-0 items-center justify-center">
          <Asset
            name="icons/ic_fluent_chevron_right_16_regular.svg"
            className={cn(
              'size-icon-16 shrink-0 text-text-fill-primary',
              isExpanded && 'rotate-90',
            )}
          />
        </span>
        <span className="min-w-0 flex-1 type-body-large text-text-fill-primary">{title}</span>
      </button>
      {isExpanded ? (
        <div id={contentId} className="w-full min-w-0">
          {children}
        </div>
      ) : null}
    </div>
  );
}
