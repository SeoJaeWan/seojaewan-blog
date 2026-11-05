import { Button } from '@base-ui/react/button';
import {
  type ComponentProps,
  type JSX,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import { ListItem } from '@seojaewan/design-system';

type ItemListRowProps = Omit<
  ComponentProps<'div'>,
  'id' | 'title' | 'children' | 'ref' | 'role' | 'tabIndex'
> & {
  id: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  isSelected?: boolean;
  onOpen?: (id: string) => void;
  ref?: Ref<HTMLDivElement>;
};

/**
 * Start 목록과 검색 화면의 항목 한 줄(`ListItem`)을 Base UI Button으로 그린다. 클릭·Enter·Space로 열고, 열면 `onOpen`을 부른다.
 * 고른 줄이 보이는 영역 밖이면 스크롤해 보이게 한다(방향키로 고르는 검색 결과).
 * 고른 줄은 `aria-current`로 알린다.
 * 받은 속성과 ref는 줄 요소에 그대로 넘기므로, 쓰는 곳이 줄을 우클릭 영역(`ContextMenuArea`의 `area`)으로 바로 쓸 수 있다.
 * 줄의 `onClick`은 열기와 함께 부른다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[검색:결과 화면]]
 * @codocs [[접근성:역할]]
 * @param props 컴포넌트 속성
 * @param props.id 항목 id. 열 때 `onOpen`에 넘긴다
 * @param props.title 항목 이름
 * @param props.subtitle 이름 아래 보조 설명. 주면 두 줄 크기(two-line)로 그린다
 * @param props.icon 이름 앞 아이콘
 * @param props.isSelected 지금 고른 줄인지(검색 결과의 선택). `ListItem`의 선택 바탕을 깔고 `aria-current`를 단다
 * @param props.onOpen 줄을 열었을 때(클릭·Enter·Space) 그 항목의 id로 부른다
 * @param props.ref 줄 요소의 ref. 우클릭 메뉴(`ContextMenu.Trigger`)처럼 줄에 동작을 붙이는 쪽이 넘긴다
 * @param props.onClick 줄을 눌렀을 때. 열기(`onOpen`)와 함께 부른다
 */
export function ItemListRow({
  id,
  title,
  subtitle,
  icon,
  isSelected = false,
  onOpen: handleOpenItem,
  ref: forwardedRef,
  onClick: handleClickProp,
  ...rowAttributes
}: ItemListRowProps): JSX.Element {
  const rowRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    forwardedRef,
    /**
     * 받은 ref에 줄 요소를 넘긴다.
     * @returns 줄 요소
     */
    () => {
      if (rowRef.current === null) {
        throw new Error('항목 줄 요소가 없다');
      }
      return rowRef.current;
    },
    [],
  );

  useEffect(
    /** 고른 줄이 되면 보이는 영역 밖일 때만 스크롤해 보이게 한다. */
    () => {
      if (isSelected) {
        rowRef.current?.scrollIntoView({ block: 'nearest' });
      }
    },
    [isSelected],
  );

  /** 줄을 열면 쓰는 곳에 항목 id를 알린다. */
  function handleOpen(): void {
    handleOpenItem?.(id);
  }

  /**
   * 줄을 누르면 받은 `onClick`을 부르고 연다.
   * @param event 마우스 이벤트
   */
  function handleClick(event: MouseEvent<HTMLDivElement>): void {
    handleClickProp?.(event);
    handleOpen();
  }

  const rowProps = {
    ...rowAttributes,
    ref: rowRef,
    'aria-current': isSelected ? ('true' as const) : undefined,
    isSelected,
    title,
    icon,
    onClick: handleClick,
  };
  return (
    <Button
      nativeButton={false}
      render={
        subtitle === undefined ? (
          <ListItem {...rowProps} />
        ) : (
          <ListItem {...rowProps} size="two-line" subtitle={subtitle} />
        )
      }
    />
  );
}
