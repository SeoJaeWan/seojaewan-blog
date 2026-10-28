import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ComponentProps, JSX } from 'react';

import { Menu, MenuItem, MenuZoomItem, Popover, Separator } from '@seojaewan/design-system';

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
  /** 펼쳐 보일 하위 메뉴 항목. 있으면 항목 오른쪽에 하위 메뉴를 연 모습으로 그린다(조립 스토리) */
  submenu?: readonly MenuPopupEntry[];
  /**
   * 실제로 여닫는 하위 메뉴 항목. 있으면 마우스를 올리거나 →·Enter 키로 항목 오른쪽에 하위 메뉴를 연다(앱의 메뉴).
   * `submenu`와 함께 쓰지 않는다
   */
  entries?: readonly MenuPopupEntry[];
};

/** 켜고 끄는 항목(피그마 MenuItem `Kind=Toggle on/off`) */
export type MenuPopupCheckbox = {
  kind: 'checkbox';
  /** 항목 이름 */
  label: string;
  /** 켜짐 여부 */
  checked: boolean;
  /** 고를 수 없게 한다 */
  disabled?: boolean;
  /** 켜짐 여부가 바뀔 때 호출 */
  onCheckedChange?: (checked: boolean) => void;
};

/** 라디오 묶음 안의 선택지 하나 */
export type MenuPopupRadioOption = {
  /** 묶음 안에서 이 선택지를 가리키는 값 */
  value: string;
  /** 항목 이름 */
  label: string;
};

/**
 * 여럿 중 하나를 고르는 라디오 항목 묶음(피그마 MenuItem `Kind=Radio on/off`가 이어진 줄들).
 * 고른 값은 묶음 하나가 가지므로, 골라진 항목(`Radio on`)은 언제나 하나다.
 */
export type MenuPopupRadioGroup = {
  kind: 'radio-group';
  /** 위에서부터 그릴 선택지 */
  options: readonly MenuPopupRadioOption[];
  /** 지금 고른 선택지의 값 */
  value: string;
  /** 다른 선택지를 골랐을 때 호출 */
  onValueChange?: (value: string) => void;
};

/** 확대/축소 조절 줄(피그마 MenuZoomItem). −·+ 버튼은 메뉴 항목이 아니라 일반 버튼이라 눌러도 메뉴가 닫히지 않는다 */
export type MenuPopupZoom = {
  kind: 'zoom';
  /** 지금 배율 글자(예: `100%`) */
  value: string;
  /** 줄이기(−)를 눌렀을 때 호출 */
  onZoomOut?: () => void;
  /** 키우기(+)를 눌렀을 때 호출 */
  onZoomIn?: () => void;
  /** 줄이기를 쓸 수 없게 한다 */
  isZoomOutDisabled?: boolean;
  /** 키우기를 쓸 수 없게 한다 */
  isZoomInDisabled?: boolean;
};

/** 항목 사이 구분선(피그마 조립의 `separator` 배치 프레임과 Separator) */
export type MenuPopupSeparator = { kind: 'separator' };

/** 메뉴 한 줄 */
export type MenuPopupEntry =
  | MenuPopupCommand
  | MenuPopupSubmenu
  | MenuPopupCheckbox
  | MenuPopupRadioGroup
  | MenuPopupZoom
  | MenuPopupSeparator;

type MenuPanelProps = {
  /** 메뉴 항목과 구분선. 위에서부터 그린다 */
  items: readonly MenuPopupEntry[];
  /** 메뉴 바탕(Menu) 너비를 바꾸는 클래스. 없으면 Menu 기본 너비다 */
  className?: string;
  /** 항목 줄 너비를 바꾸는 클래스. 없으면 MenuItem 기본 너비다 */
  itemClassName?: string;
};

// 피그마 Popover의 트리거(하위 메뉴 항목)와 팝업(하위 메뉴) 사이 간격(spacing/4)이다.
const SUBMENU_OFFSET = 4;

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
            key={entryKey(entry, index)}
            entry={entry}
            itemClassName={props.itemClassName}
          />
        ),
      )}
    </Menu>
  );
}

/**
 * 메뉴 한 줄의 React key를 만든다. 구분선은 순서로, 라디오 묶음은 첫 선택지 값으로, 나머지는 이름으로 구분한다.
 * @param entry 메뉴 한 줄
 * @param index 순서
 * @returns React key
 */
function entryKey(entry: MenuPopupEntry, index: number): string {
  switch (entry.kind) {
    case 'separator':
      return `separator-${String(index)}`;
    case 'zoom':
      return 'zoom';
    case 'radio-group':
      return `radio-group-${entry.options[0]?.value ?? String(index)}`;
    default:
      return entry.label;
  }
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
    case 'zoom': {
      const { onZoomOut: handleZoomOut, onZoomIn: handleZoomIn } = entry;
      return (
        <MenuZoomItem
          value={entry.value}
          onZoomOut={handleZoomOut}
          onZoomIn={handleZoomIn}
          isZoomOutDisabled={entry.isZoomOutDisabled}
          isZoomInDisabled={entry.isZoomInDisabled}
        />
      );
    }
    case 'checkbox': {
      const { onCheckedChange: handleCheckedChange } = entry;
      return (
        <MenuItem
          kind="checkbox"
          label={entry.label}
          checked={entry.checked}
          disabled={entry.disabled}
          onCheckedChange={handleCheckedChange}
          className={itemClassName}
        />
      );
    }
    case 'radio-group': {
      // 선택지들을 Base UI 라디오 묶음 하나에 두어, 묶음의 값과 같은 선택지 하나만 골라진 모습(점)으로 그린다.
      const { onValueChange: handleValueChange } = entry;
      return (
        <BaseMenu.RadioGroup value={entry.value} onValueChange={handleValueChange}>
          {entry.options.map(
            /**
             * 선택지 하나를 라디오 항목으로 그린다.
             * @param option 선택지
             * @returns 라디오 항목
             */
            (option) => (
              <MenuItem
                key={option.value}
                kind="radio"
                label={option.label}
                value={option.value}
                className={itemClassName}
              />
            ),
          )}
        </BaseMenu.RadioGroup>
      );
    }
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
  if (entry.entries !== undefined) {
    return (
      // 실제 하위 메뉴다. Base UI가 마우스·키보드로 여닫고, 피그마 Popover `Right-Start`처럼 항목 오른쪽에 위를 맞춰 간격(spacing/4)을 두고 붙인다.
      <BaseMenu.SubmenuRoot>
        <MenuItem
          kind="submenu"
          label={entry.label}
          icon={entry.icon}
          disabled={entry.disabled}
          className={itemClassName}
        />
        <BaseMenu.Portal>
          <BaseMenu.Positioner side="inline-end" align="start" sideOffset={SUBMENU_OFFSET}>
            <MenuPopup items={entry.entries} />
          </BaseMenu.Positioner>
        </BaseMenu.Portal>
      </BaseMenu.SubmenuRoot>
    );
  }
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
