import { Menu as BaseMenu } from '@base-ui/react/menu';
import { type AnimationEvent, type ComponentProps, type JSX, useState } from 'react';

import { Menu, MenuItem, MenuSeparator } from '@seojaewan/design-system';

type MenuItemIcon = ComponentProps<typeof MenuItem>['icon'];

/** 고르면 바로 실행하는 항목(피그마 MenuItem `Variant=Default`). shortcut은 오른쪽에 흐리게 보이는 글자(단축키나 확대 비율)다. */
export type MenuPopupCommand = {
  kind?: 'command';
  label: string;
  icon?: MenuItemIcon;
  shortcut?: string;
  isDisabled?: boolean;
  onClick?: () => void;
};

/** 하위 메뉴를 여는 항목(피그마 MenuItem `Variant=Submenu`). entries는 실제로 여닫는 하위 메뉴 항목이다. 있으면 마우스를 올리거나 →·Enter 키로 항목 오른쪽에 하위 메뉴를 열고(앱의 메뉴), 없으면 닫은 모습으로만 그린다(조립 스토리). */
export type MenuPopupSubmenu = {
  kind: 'submenu';
  label: string;
  icon?: MenuItemIcon;
  isDisabled?: boolean;
  entries?: readonly MenuPopupEntry[];
};

/** 켜고 끄는 항목(피그마 MenuItem `Variant=Toggle on/off`) */
export type MenuPopupCheckbox = {
  kind: 'checkbox';
  label: string;
  isChecked: boolean;
  isDisabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/** 라디오 묶음 안의 선택지 하나. value는 묶음 안에서 이 선택지를 가리키는 값이다. */
export type MenuPopupRadioOption = {
  value: string;
  label: string;
};

/**
 * 여럿 중 하나를 고르는 라디오 항목 묶음(피그마 MenuItem `Variant=Radio on/off`가 이어진 줄들).
 * 고른 값은 묶음 하나가 가지므로, 골라진 항목(`Radio on`)은 언제나 하나다.
 */
export type MenuPopupRadioGroup = {
  kind: 'radio-group';
  options: readonly MenuPopupRadioOption[];
  value: string;
  onValueChange?: (value: string) => void;
};

/** 확대/축소 조절 줄(피그마 MenuItem `Variant=Zoom`). −·+ 버튼은 메뉴 항목이지만 눌러도 메뉴가 닫히지 않는다. value는 지금 배율 글자(예: `100%`)다. */
export type MenuPopupZoom = {
  kind: 'zoom';
  value: string;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  isZoomOutDisabled?: boolean;
  isZoomInDisabled?: boolean;
};

/** 항목 사이 구분선(피그마 MenuSeparator) */
export type MenuPopupSeparator = { kind: 'separator' };

/** 메뉴 한 줄 */
export type MenuPopupEntry =
  | MenuPopupCommand
  | MenuPopupSubmenu
  | MenuPopupCheckbox
  | MenuPopupRadioGroup
  | MenuPopupZoom
  | MenuPopupSeparator;

export type MenuPopupWidth = 'default' | 'view-options';

// 메뉴 바탕(Menu) 너비다. 피그마 메뉴 조립이 Menu 인스턴스에 연결한 너비 변수로, 기본은 Menu 자신의 너비(size/menu/width)이고
// `Menu/ViewOptions`만 size/menu/view-options-width다. 항목(MenuItem)은 늘 바탕 너비를 채운다.
const menuWidthClassNames = {
  default: undefined,
  'view-options': 'w-size-menu-view-options-width',
} as const satisfies Record<MenuPopupWidth, string | undefined>;
const DEFAULT_MENU_WIDTH: MenuPopupWidth = 'default';

type MenuPanelProps = {
  items: readonly MenuPopupEntry[];
  width?: MenuPopupWidth;
};

/** 메뉴를 열 때의 움직임. menu는 드롭다운·우클릭 메뉴, submenu는 하위 메뉴다. */
export type MenuPopupMotion = 'menu' | 'submenu';

// 메뉴를 열 때의 움직임이다([[피그마 연동:모션 클래스]]). 드롭다운·우클릭 메뉴는 열리는 쪽으로 미끄러져 나오고,
// 하위 메뉴는 측정하지 않아 지금처럼 페이드로 나타난다.
const enterClassNames = {
  menu: 'motion-menu-enter',
  submenu: 'motion-flyout-enter',
} as const satisfies Record<MenuPopupMotion, string>;
const DEFAULT_MOTION: MenuPopupMotion = 'menu';

// 피그마 Popover의 트리거(하위 메뉴 항목)와 팝업(하위 메뉴) 사이 간격(spacing/4)이다.
const SUBMENU_OFFSET = 4;

type MenuPopupProps = MenuPanelProps & {
  motion?: MenuPopupMotion;
} & Omit<ComponentProps<typeof BaseMenu.Popup>, 'children' | 'className' | 'render'>;

/**
 * 메뉴 조립(피그마 `Menu/*`)을 그린다. 우클릭 메뉴, Chrome ⋮ 메뉴, 전원 메뉴처럼 구조가 같은 메뉴를 항목 데이터만 바꿔 그린다.
 * Base UI Menu의 팝업(`Menu.Popup`)이라 키보드 조작과 접근성은 Base UI가 맡고, 쓰는 곳이 `Menu.Root`·`Menu.Positioner`로
 * 열고 닫기와 위치를 정한다. 나머지 속성은 팝업 요소에 준다.
 * 열 때 `motion-menu-enter`로 열리는 쪽으로 미끄러져 나온다(페이드 없음). 팝업이 자르는 틀이고 안의 메뉴 바탕이 움직이며,
 * 열리는 쪽은 Base UI가 팝업에 다는 `data-side`로 정해진다. 틀이 시작 가장자리의 그림자를 자르지 않도록 움직임이 끝나면 클래스를 뗀다.
 * 하위 메뉴는 측정하지 않아 지금처럼 `motion-flyout-enter`로 페이드해 나타난다. 사라지는 움직임은 없어 Base UI가 기다리지 않고 바로 닫는다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[피그마 연동:모션 클래스]]
 * @param props 컴포넌트 속성
 * @param props.items 메뉴 항목과 구분선. 위에서부터 그린다
 * @param props.width 메뉴 바탕 너비(피그마 메뉴 조립의 Menu 너비). 없으면 Menu 기본 너비다
 * @param props.motion 열 때의 움직임. 없으면 드롭다운·우클릭 메뉴의 움직임이다
 */
export function MenuPopup({
  items,
  width,
  motion = DEFAULT_MOTION,
  ...popupProps
}: MenuPopupProps): JSX.Element {
  const [isEntering, setIsEntering] = useState(true);

  /**
   * 열기 움직임이 끝나면 모션 클래스(메뉴는 자르는 틀)를 뗀다. 포털한 하위 메뉴의 이벤트도 React 트리로 올라오므로
   * 이 팝업이나 바로 안의 메뉴 바탕에서 끝난 움직임만 본다.
   * @param event 애니메이션 끝 이벤트
   */
  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>): void {
    const { target, currentTarget } = event;
    if (
      target === currentTarget ||
      (target instanceof Element && target.parentElement === currentTarget)
    ) {
      setIsEntering(false);
    }
  }

  return (
    <BaseMenu.Popup
      {...popupProps}
      className={isEntering ? `${enterClassNames[motion]} outline-none` : 'outline-none'}
      onAnimationEnd={handleAnimationEnd}
    >
      <MenuPanel items={items} width={width} />
    </BaseMenu.Popup>
  );
}

/**
 * 메뉴 바탕(Menu)과 그 안의 항목을 그린다. 하위 메뉴도 같은 바탕으로 그린다.
 * @param props 컴포넌트 속성
 * @param props.width 메뉴 바탕 너비(피그마 메뉴 조립의 Menu 너비). 없으면 Menu 기본 너비다
 * @param props.items 메뉴 항목과 구분선. 위에서부터 그린다
 */
function MenuPanel({ width, items }: MenuPanelProps): JSX.Element {
  return (
    <Menu className={menuWidthClassNames[width ?? DEFAULT_MENU_WIDTH]}>
      {items.map(
        /**
         * 메뉴 한 줄을 그린다.
         * @param entry 메뉴 한 줄
         * @param index 순서
         * @returns 메뉴 요소
         */
        (entry, index) => (
          <MenuEntry key={entryKey(entry, index)} entry={entry} />
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
 * @param props 컴포넌트 속성
 * @param props.entry 메뉴 한 줄
 */
function MenuEntry({ entry }: { entry: MenuPopupEntry }): JSX.Element {
  switch (entry.kind) {
    case 'separator':
      // 메뉴 안쪽 너비를 채우는 구분선(피그마 MenuSeparator)이다. 너비는 메뉴 바탕(Flyout)이 채운다.
      return <MenuSeparator />;
    case 'submenu':
      return <SubmenuEntry entry={entry} />;
    case 'zoom': {
      const { onZoomOut: handleZoomOut, onZoomIn: handleZoomIn } = entry;
      return (
        <MenuItem
          variant="zoom"
          label="확대/축소"
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
          variant="checkbox"
          label={entry.label}
          isChecked={entry.isChecked}
          isDisabled={entry.isDisabled}
          onCheckedChange={handleCheckedChange}
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
                variant="radio"
                label={option.label}
                value={option.value}
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
          isDisabled={entry.isDisabled}
          onClick={handleClick}
        />
      );
    }
  }
}

/**
 * 하위 메뉴 항목을 그린다. 여닫을 하위 메뉴(`entries`)가 있으면 항목 오른쪽에 위를 맞춰 붙이는 실제 하위 메뉴로 그리고,
 * 없으면 닫은 모습으로 그린다. 피그마 조립은 하위 메뉴를 닫은 모양으로만 그린다.
 * @param props 컴포넌트 속성
 * @param props.entry 하위 메뉴 항목
 */
function SubmenuEntry({ entry }: { entry: MenuPopupSubmenu }): JSX.Element {
  if (entry.entries !== undefined) {
    return (
      // 실제 하위 메뉴다. Base UI가 마우스·키보드로 여닫고, 피그마 Popover `Right-Start`처럼 항목 오른쪽에 위를 맞춰 간격(spacing/4)을 두고 붙인다.
      <BaseMenu.SubmenuRoot>
        <MenuItem
          variant="submenu"
          label={entry.label}
          icon={entry.icon}
          isDisabled={entry.isDisabled}
        />
        <BaseMenu.Portal>
          <BaseMenu.Positioner side="inline-end" align="start" sideOffset={SUBMENU_OFFSET}>
            <MenuPopup items={entry.entries} motion="submenu" />
          </BaseMenu.Positioner>
        </BaseMenu.Portal>
      </BaseMenu.SubmenuRoot>
    );
  }
  return (
    // 닫은 모습이다. 마우스·키보드로 여는 하위 메뉴는 `entries`가 맡는다.
    <BaseMenu.SubmenuRoot open={false}>
      <MenuItem
        variant="submenu"
        label={entry.label}
        icon={entry.icon}
        isDisabled={entry.isDisabled}
      />
    </BaseMenu.SubmenuRoot>
  );
}

/**
 * 메뉴를 포털할 자리인 문서 끝(body)을 돌려준다. 주지 않으면 Base UI가 감싼 포털(Start·검색 패널) 안에 그려, 메뉴가 작업 표시줄 뒤로 들어가고 누를 수 없게 된다.
 * 메뉴는 열려야 그려지므로 서버에서는 쓰지 않는다.
 * @returns 문서 끝. 서버에서는 undefined
 */
export function getMenuPortalContainer(): HTMLElement | undefined {
  return typeof document === 'undefined' ? undefined : document.body;
}
