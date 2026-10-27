import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX } from 'react';

import { Menu, MenuItem, Popover, Separator } from '@seojaewan/design-system';

type MenuItemIcon = ComponentProps<typeof MenuItem>['icon'];

/** 고르면 바로 실행하는 항목(피그마 MenuItem `Kind=Default`) */
export type MenuPopupCommand = {
  kind?: 'command';
  /** 항목 이름 */
  label: string;
  /** 이름 앞 아이콘 자산 */
  icon?: MenuItemIcon;
  /** 오른쪽에 흐리게 보이는 글자(단축키나 확대 비율) */
  shortcut?: string;
  /** 고를 수 없게 한다 */
  disabled?: boolean;
  /** 항목을 골랐을 때 호출 */
  onClick?: () => void;
};

/** 하위 메뉴를 여는 항목(피그마 MenuItem `Kind=Submenu`) */
export type MenuPopupSubmenu = {
  kind: 'submenu';
  /** 항목 이름 */
  label: string;
  /** 이름 앞 아이콘 자산 */
  icon?: MenuItemIcon;
  /** 고를 수 없게 한다 */
  disabled?: boolean;
  /** 펼쳐 보일 하위 메뉴 항목. 있으면 항목 오른쪽에 하위 메뉴를 연 모습으로 그린다 */
  submenu?: readonly MenuPopupEntry[];
};

/** 켜고 끄는 항목(피그마 MenuItem `Kind=Toggle on/off`) */
export type MenuPopupCheckbox = {
  kind: 'checkbox';
  /** 항목 이름 */
  label: string;
  /** 켜짐 여부 */
  checked: boolean;
  /** 켜짐 여부가 바뀔 때 호출 */
  onCheckedChange?: (checked: boolean) => void;
};

/** 여럿 중 하나를 고르는 항목(피그마 MenuItem `Kind=Radio on/off`) */
export type MenuPopupRadio = {
  kind: 'radio';
  /** 항목 이름 */
  label: string;
  /** 골라졌는지 */
  checked: boolean;
};

/** 항목 사이 구분선(피그마 조립의 `separator` 배치 프레임과 Separator) */
export type MenuPopupSeparator = { kind: 'separator' };

/** 메뉴 한 줄 */
export type MenuPopupEntry =
  MenuPopupCommand | MenuPopupSubmenu | MenuPopupCheckbox | MenuPopupRadio | MenuPopupSeparator;

type MenuPanelProps = {
  /** 메뉴 항목과 구분선. 위에서부터 그린다 */
  items: readonly MenuPopupEntry[];
  /** 메뉴 바탕(Menu) 너비를 바꾸는 클래스. 없으면 Menu 기본 너비다 */
  className?: string;
  /** 항목 줄 너비를 바꾸는 클래스. 없으면 MenuItem 기본 너비다 */
  itemClassName?: string;
};

type MenuPopupProps = MenuPanelProps &
  Omit<ComponentProps<typeof BaseMenu.Popup>, 'children' | 'className' | 'render'>;

/**
 * 메뉴 조립(피그마 `Menu/*`)을 그린다. 우클릭 메뉴, Chrome ⋮ 메뉴, 전원 메뉴처럼 구조가 같은 메뉴를 항목 데이터만 바꿔 그린다.
 * Base UI Menu의 팝업(`Menu.Popup`)이라 키보드 조작과 접근성은 Base UI가 맡고, 쓰는 곳이 `Menu.Root`·`Menu.Positioner`로
 * 열고 닫기와 위치를 정한다. 나머지 속성은 팝업 요소에 준다.
 * 열 때 `motion-flyout-enter`로 페이드해 나타난다. 사라지는 움직임은 없어 Base UI가 기다리지 않고 바로 닫는다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @param props
 */
export function MenuPopup(props: MenuPopupProps): JSX.Element {
  const { items, className, itemClassName, ...popupProps } = props;
  return (
    <BaseMenu.Popup {...popupProps} className="motion-flyout-enter outline-none">
      <MenuPanel items={items} className={className} itemClassName={itemClassName} />
    </BaseMenu.Popup>
  );
}

/**
 * 메뉴 바탕(Menu)과 그 안의 항목을 그린다. 하위 메뉴도 같은 바탕으로 그린다.
 * @param props
 */
function MenuPanel(props: MenuPanelProps): JSX.Element {
  return (
    <Menu className={props.className}>
      {props.items.map(
        /**
         * 메뉴 한 줄을 그린다.
         * @param entry 메뉴 한 줄
         * @param index 순서
         * @returns 메뉴 요소
         */
        (entry, index) => (
          <MenuEntry
            key={entry.kind === 'separator' ? `separator-${String(index)}` : entry.label}
            entry={entry}
            itemClassName={props.itemClassName}
          />
        ),
      )}
    </Menu>
  );
}

/**
 * 메뉴 한 줄을 종류에 맞는 MenuItem이나 구분선으로 그린다.
 * @param props
 * @param props.entry 메뉴 한 줄
 * @param props.itemClassName 항목 줄 너비 클래스
 */
function MenuEntry(props: { entry: MenuPopupEntry; itemClassName?: string }): JSX.Element {
  const { entry, itemClassName } = props;
  switch (entry.kind) {
    case 'separator':
      // 피그마 `separator` 배치 프레임: 위 2·아래 6 여백 안에 메뉴 안쪽 너비를 채우는 가로선이다.
      return (
        <div className="flex w-full flex-col pt-2 pb-6">
          <Separator className="w-full" />
        </div>
      );
    case 'submenu':
      return <SubmenuEntry entry={entry} itemClassName={itemClassName} />;
    case 'checkbox': {
      const { onCheckedChange: handleCheckedChange } = entry;
      return (
        <MenuItem
          kind="checkbox"
          label={entry.label}
          checked={entry.checked}
          onCheckedChange={handleCheckedChange}
          className={itemClassName}
        />
      );
    }
    case 'radio':
      // 피그마 조립은 라디오 항목마다 골라짐 여부를 따로 그린다. 그 모습을 그대로 그리려고 항목마다 묶음을 두고,
      // 골라진 항목만 묶음의 값을 자기 값으로 둔다. 고르는 동작은 기능을 구현할 때 묶음을 합쳐 붙인다.
      return (
        <BaseMenu.RadioGroup value={entry.checked ? entry.label : null}>
          <MenuItem
            kind="radio"
            label={entry.label}
            value={entry.label}
            className={itemClassName}
          />
        </BaseMenu.RadioGroup>
      );
    case 'command':
    case undefined: {
      const { onClick: handleClick } = entry;
      return (
        <MenuItem
          label={entry.label}
          icon={entry.icon}
          shortcut={entry.shortcut}
          disabled={entry.disabled}
          onClick={handleClick}
          className={itemClassName}
        />
      );
    }
  }
}

/**
 * 하위 메뉴 항목을 그린다. 펼칠 하위 메뉴가 있으면 피그마처럼 Popover(오른쪽, 위 맞춤)로 항목 옆에 하위 메뉴를 붙이고,
 * 항목은 하위 메뉴가 열린 모습(강조)으로 그린다.
 * @param props
 * @param props.entry 하위 메뉴 항목
 * @param props.itemClassName 항목 줄 너비 클래스
 */
function SubmenuEntry(props: { entry: MenuPopupSubmenu; itemClassName?: string }): JSX.Element {
  const { entry, itemClassName } = props;
  const isExpanded = entry.submenu !== undefined;
  const trigger = (
    // 하위 메뉴를 연 상태면 Base UI가 항목에 data-popup-open을 달아 MenuItem이 강조 색을 칠한다.
    <BaseMenu.SubmenuRoot open={isExpanded}>
      <MenuItem
        kind="submenu"
        label={entry.label}
        icon={entry.icon}
        disabled={entry.disabled}
        className={itemClassName}
      />
    </BaseMenu.SubmenuRoot>
  );
  if (entry.submenu === undefined) {
    return trigger;
  }
  return (
    // 피그마 Popover는 트리거(항목) 너비로 줄어든다. 메뉴 안쪽 너비로 늘어나지 않게 줄 정렬을 시작에 둔다.
    <Popover
      open
      placement="right-start"
      className="self-start"
      trigger={trigger}
      popup={<MenuPanel items={entry.submenu} />}
    />
  );
}
