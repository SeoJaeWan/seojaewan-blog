import { Menu } from '@base-ui/react/menu';
import type { ComponentProps, JSX } from 'react';

import { Flyout, MenuItem } from '@seojaewan/design-system';

/** 메뉴 항목 하나(피그마 MenuItem 인스턴스) */
export type ContextMenuItem = {
  /** 항목 이름 */
  label: string;
  /** 이름 앞 아이콘 자산 */
  icon?: ComponentProps<typeof MenuItem>['icon'];
  /** 오른쪽 단축키 */
  shortcut?: string;
  /** 고를 수 없게 한다 */
  disabled?: boolean;
  /** 항목을 골랐을 때 호출 */
  onClick?: () => void;
};

/** 항목 사이 구분선(피그마 Separator 인스턴스) */
export type ContextMenuSeparator = { separator: true };

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

type ContextMenuProps = Omit<ComponentProps<typeof Flyout>, 'children' | 'material'> & {
  /** 메뉴 항목과 구분선. 위에서부터 그린다 */
  items: readonly ContextMenuEntry[];
  /** 메뉴가 열렸는지 */
  open: boolean;
  /** 열림 상태가 바뀔 때 호출 */
  onOpenChange?: (open: boolean) => void;
  /** 메뉴를 붙일 기준(요소나 우클릭 위치를 담은 가상 요소) */
  anchor: ComponentProps<typeof Menu.Positioner>['anchor'];
  /** 메뉴를 그릴 포털 대상. 없으면 body다 */
  container?: HTMLElement | null;
};

/**
 * 우클릭 메뉴(피그마 조립 `Menu/*`)를 그린다. 메뉴 바탕은 Flyout, 항목은 MenuItem이고 키보드 조작과 접근성은
 * Base UI Menu가 맡는다. 항목은 쓰는 곳마다 달라 배열로 받는다. 나머지 속성은 메뉴 바탕(Flyout)에 준다.
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function ContextMenu(props: ContextMenuProps): JSX.Element {
  const {
    items,
    open: isOpen,
    onOpenChange: handleOpenChange,
    anchor,
    container,
    ...flyoutProps
  } = props;
  return (
    <Menu.Root open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <Menu.Portal container={container}>
        <Menu.Positioner anchor={anchor} side="bottom" align="start" sideOffset={0}>
          <Menu.Popup className="outline-none">
            <Flyout {...flyoutProps}>{items.map(renderEntry)}</Flyout>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * 메뉴 항목이나 구분선 하나를 그린다.
 * @param entry 항목이나 구분선
 * @param index 순서
 * @returns 메뉴 요소
 */
function renderEntry(entry: ContextMenuEntry, index: number): JSX.Element {
  if ('separator' in entry) {
    // 디자인 시스템에 Separator 컴포넌트가 아직 없어 접근성 역할만 둔다(모양은 그리지 않는다).
    return <Menu.Separator key={`separator-${String(index)}`} />;
  }
  return <MenuItem key={entry.label} {...entry} />;
}
