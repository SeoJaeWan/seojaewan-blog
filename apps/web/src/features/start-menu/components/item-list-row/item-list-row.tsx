import { type JSX, type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';

import { ListItem } from '@seojaewan/design-system';

type ItemListRowProps = {
  /** 항목 id. 열 때 `onOpen`에 넘긴다 */
  id: string;
  /** 항목 이름 */
  title: string;
  /** 이름 아래 보조 설명. 주면 두 줄 크기(two-line)로 그린다 */
  subtitle?: string;
  /** 이름 앞 아이콘 */
  icon: ReactNode;
  /** 지금 고른 줄인지(검색 결과의 선택). `ListItem`의 선택 바탕을 깔고 `aria-current`를 단다 */
  isSelected?: boolean;
  /** 줄을 열었을 때(클릭·Enter·Space) 그 항목의 id로 부른다 */
  onOpen?: (id: string) => void;
  /** 바깥 배치 클래스 */
  className?: string;
};

/**
 * Start 목록과 검색 화면의 항목 한 줄(`ListItem`)을 열 수 있는 버튼으로 그린다. 클릭·Enter·Space로 열고, 열면 `onOpen`을 부른다.
 * 고른 줄이 보이는 영역 밖이면 스크롤해 보이게 한다(방향키로 고르는 검색 결과).
 * 버튼 역할에는 `aria-selected`가 맞지 않아 `ListItem`이 붙이는 값을 빼고, 고른 줄은 `aria-current`로 알린다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[검색:결과 화면]]
 * @param props
 */
export function ItemListRow(props: ItemListRowProps): JSX.Element {
  const { id, title, subtitle, icon, isSelected = false, className } = props;
  const rowRef = useRef<HTMLDivElement>(null);

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
    props.onOpen?.(id);
  }

  /**
   * Enter·Space를 누르면 줄을 누른 것으로 본다.
   * @param event 키 이벤트
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  }

  const rowProps = {
    ref: rowRef,
    role: 'button',
    tabIndex: 0,
    'aria-selected': undefined,
    'aria-current': isSelected ? ('true' as const) : undefined,
    selected: isSelected,
    title,
    icon,
    className,
    onClick: handleOpen,
    onKeyDown: handleKeyDown,
  };
  return subtitle === undefined ? (
    <ListItem {...rowProps} />
  ) : (
    <ListItem {...rowProps} size="two-line" subtitle={subtitle} />
  );
}
