import { Menu as BaseMenu } from '@base-ui/react/menu';
import {
  type AnimationEvent,
  type ComponentProps,
  type JSX,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Menu,
  MenuCommandBar,
  MenuCommandButton,
  MenuItem,
  MenuSeparator,
} from '@seojaewan/design-system';

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
  icon?: MenuItemIcon;
  shortcut?: string;
  isChecked: boolean;
  isDisabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/** 라디오 묶음 안의 선택지 하나. value는 묶음 안에서 이 선택지를 가리키는 값이다. */
export type MenuPopupRadioOption = {
  value: string;
  label: string;
  icon?: MenuItemIcon;
  shortcut?: string;
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

/** 단추 줄의 명령 단추 하나(피그마 MenuCommandButton). shortcut은 툴팁에 `이름 (단축키)`로 보이는 단축키다. */
export type MenuPopupCommandButton = {
  label: string;
  icon: ComponentProps<typeof MenuCommandButton>['icon'];
  shortcut?: string;
  onClick?: () => void;
};

/**
 * 자주 쓰는 명령을 모은 단추 줄(피그마 MenuCommandBar). 목록의 어디에 두어도 목록 한 줄로 그리지 않고,
 * 메뉴가 아래로 열리면 맨 위, 위로 열리면 맨 아래에 구분선과 함께 그린다. 단추가 없으면 그리지 않는다.
 */
export type MenuPopupCommandBar = {
  kind: 'command-bar';
  buttons: readonly MenuPopupCommandButton[];
};

/** 메뉴 한 줄 */
export type MenuPopupEntry =
  | MenuPopupCommand
  | MenuPopupSubmenu
  | MenuPopupCheckbox
  | MenuPopupRadioGroup
  | MenuPopupZoom
  | MenuPopupSeparator
  | MenuPopupCommandBar;

/** 메뉴 목록에 한 줄로 그리는 항목(단추 줄을 뺀 메뉴 한 줄) */
type MenuPopupListEntry = Exclude<MenuPopupEntry, MenuPopupCommandBar>;

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

/** Base UI가 팝업에 알려 주는, 메뉴가 기준 요소의 어느 쪽에 열렸는지 */
type MenuPopupSide = BaseMenu.Popup.State['side'];

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

// 마우스가 항목에 이만큼(ms) 머물러야 하위 메뉴를 열거나 바꾸거나 닫는다. Windows 기본 `MenuShowDelay`(400ms)라 모션 토큰이 아니다.
export const SUBMENU_HOVER_DELAY = 400;

// 하위 메뉴 항목을 감싼 요소에 다는 속성이다. 값은 그 항목의 key이고, 마우스가 어느 하위 메뉴 항목 위에 있는지 찾는 데 쓴다.
const SUBMENU_KEY_ATTRIBUTE = 'data-submenu-key';

// 따르지 않는 Base UI의 하위 메뉴 여닫기 이유다. 마우스로 여닫는 것은 MenuPanel의 타이머 하나가 정한다.
// trigger-hover는 항목에 올리거나 벗어날 때, sibling-open은 같은 메뉴의 다른 항목에 올릴 때 Base UI가 보낸다.
const pointerOpenChangeReasons: ReadonlySet<string> = new Set(['trigger-hover', 'sibling-open']);

type MenuPopupProps = MenuPanelProps & {
  motion?: MenuPopupMotion;
} & Omit<ComponentProps<typeof BaseMenu.Popup>, 'children' | 'className' | 'render'>;

/**
 * 메뉴 조립(피그마 `Menu/*`)을 그린다. 우클릭 메뉴, Chrome ⋮ 메뉴, 전원 메뉴처럼 구조가 같은 메뉴를 항목 데이터만 바꿔 그린다.
 * Base UI Menu의 팝업(`Menu.Popup`)이라 키보드 조작과 접근성은 Base UI가 맡고, 쓰는 곳이 `Menu.Root`·`Menu.Positioner`로
 * 열고 닫기와 위치를 정한다. 나머지 속성은 팝업 요소에 준다.
 * 열 때 `motion-menu-enter`로 열리는 쪽으로 미끄러져 나온다(페이드 없음). 팝업이 자르는 틀이고 안의 메뉴 바탕이 움직이며,
 * 열리는 쪽은 Base UI가 팝업에 다는 `data-side`로 정해진다. 틀은 움직이는 동안만 시작 가장자리를 자른다. 움직임이 끝나면 클래스를 떼어,
 * 열린 뒤 `data-side`가 바뀌어도 다시 움직이지 않게 한다.
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

  /**
   * 팝업 요소 안에 메뉴 바탕을 그린다. 단추 줄을 맨 위에 둘지 맨 아래에 둘지 정하려고 Base UI가 알려 주는 열린 쪽(`side`)을 넘긴다.
   * @param elementProps Base UI가 팝업 요소에 줄 속성
   * @param state Base UI 팝업 상태
   * @returns 팝업 요소
   */
  function renderPopup(
    elementProps: ComponentProps<'div'>,
    state: BaseMenu.Popup.State,
  ): JSX.Element {
    return (
      <div {...elementProps}>
        <MenuPanel items={items} width={width} side={state.side} />
      </div>
    );
  }

  return (
    <BaseMenu.Popup
      {...popupProps}
      className={isEntering ? `${enterClassNames[motion]} outline-none` : 'outline-none'}
      onAnimationEnd={handleAnimationEnd}
      render={renderPopup}
    />
  );
}

/**
 * 메뉴 항목에서 단추 줄을 꺼내고 나머지 목록을 돌려준다. 단추가 없는 단추 줄은 없는 것으로 본다.
 * @param items 메뉴 항목
 * @returns 단추 줄의 단추(없으면 빈 목록)와 목록에 그릴 항목
 */
function splitCommandBar(items: readonly MenuPopupEntry[]): {
  buttons: readonly MenuPopupCommandButton[];
  listItems: MenuPopupListEntry[];
} {
  const buttons: MenuPopupCommandButton[] = [];
  const listItems: MenuPopupListEntry[] = [];
  for (const entry of items) {
    if (entry.kind === 'command-bar') {
      buttons.push(...entry.buttons);
    } else {
      listItems.push(entry);
    }
  }
  return { buttons, listItems };
}

/**
 * 단추 줄(피그마 MenuCommandBar)을 그린다. 단추를 누르면 Base UI가 메뉴를 닫는다.
 * @param props 컴포넌트 속성
 * @param props.buttons 단추. 왼쪽부터 그린다
 */
function CommandBarEntry({ buttons }: { buttons: readonly MenuPopupCommandButton[] }): JSX.Element {
  return (
    <MenuCommandBar>
      {buttons.map(
        /**
         * 단추 하나를 그린다.
         * @param button 단추
         * @returns 명령 단추
         */
        (button) => {
          const { onClick: handleClick } = button;
          return (
            <MenuCommandButton
              key={button.label}
              label={button.label}
              icon={button.icon}
              shortcut={button.shortcut}
              onClick={handleClick}
            />
          );
        },
      )}
    </MenuCommandBar>
  );
}

/**
 * 메뉴 바탕(Menu)과 그 안의 항목을 그린다. 하위 메뉴도 같은 바탕으로 그린다.
 * 이 메뉴의 하위 메뉴는 한 번에 하나만 열리고, 마우스로는 타이머 하나가 여닫는다. 마우스가 한 항목에 `SUBMENU_HOVER_DELAY` 동안
 * 머물면 그 항목이 하위 메뉴 항목일 때 그 하위 메뉴를 열고(열려 있던 다른 하위 메뉴는 같은 순간 닫는다), 일반 항목이면 열린 하위 메뉴를 닫는다.
 * 그래서 하위 메뉴가 바뀌는 사이에 하위 메뉴가 없는 빈 구간이 없다. 열린 하위 메뉴 안으로 들어가면 타이머를 멈춰, 지나온 항목으로 바뀌지 않는다.
 * 클릭과 키보드(→, Enter)는 기다리지 않고 바로 연다.
 * 단추 줄이 있으면 메뉴가 아래로 열렸을 때 맨 위, 위로 열렸을 때(`side`가 top) 맨 아래에 두고, 목록과의 사이에 구분선을 둔다.
 * 단추 줄이 늘 우클릭한 자리 가까이 있게 하기 위해서다(Windows 11 파일 메뉴와 같다). 키보드 차례도 그려진 차례를 따른다.
 * @codocs [[디자인 시스템:팝업]]
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @param props 컴포넌트 속성
 * @param props.width 메뉴 바탕 너비(피그마 메뉴 조립의 Menu 너비). 없으면 Menu 기본 너비다
 * @param props.items 메뉴 항목과 구분선, 단추 줄. 단추 줄을 뺀 항목은 위에서부터 그린다
 * @param props.side 메뉴가 기준 요소의 어느 쪽에 열렸는지
 */
function MenuPanel({ width, items, side }: MenuPanelProps & { side: MenuPopupSide }): JSX.Element {
  const { buttons, listItems } = splitCommandBar(items);
  const hasCommandBar = buttons.length > 0;
  const isOpenedAbove = side === 'top';
  const [openSubmenuKey, setOpenSubmenuKey] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  // 타이머가 끝나면 열 하위 메뉴 항목의 key다(일반 항목이면 null). 타이머가 없으면 undefined다.
  const pendingKeyRef = useRef<string | null | undefined>(undefined);

  useEffect(
    /**
     * 메뉴가 사라지면 기다리던 타이머를 멈춘다.
     * @returns 타이머를 멈추는 정리 함수
     */
    () => {
      return () => {
        window.clearTimeout(timerRef.current);
      };
    },
    [],
  );

  /** 기다리던 마우스 여닫기를 그만둔다. */
  function cancelPending(): void {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    pendingKeyRef.current = undefined;
  }

  /**
   * 하위 메뉴 하나만 바로 열거나(key) 모두 닫는다(null).
   * @param key 열 하위 메뉴 항목의 key
   */
  function showSubmenu(key: string | null): void {
    cancelPending();
    setOpenSubmenuKey(key);
  }

  /**
   * 마우스가 이 메뉴의 항목에 올라왔을 때 타이머를 건다. 그 하위 메뉴가 이미 열려 있으면 기다리던 것을 그만두고,
   * 같은 항목을 기다리는 중이면 타이머를 다시 걸지 않는다.
   * @param key 하위 메뉴 항목이면 그 key, 일반 항목이면 null
   */
  function hoverEntry(key: string | null): void {
    if (key === openSubmenuKey) {
      cancelPending();
      return;
    }
    if (timerRef.current !== undefined && pendingKeyRef.current === key) {
      return;
    }
    cancelPending();
    pendingKeyRef.current = key;
    timerRef.current = window.setTimeout(() => {
      showSubmenu(key);
    }, SUBMENU_HOVER_DELAY);
  }

  /**
   * 마우스가 올라온 곳을 본다. 포털로 그린 하위 메뉴 안의 이벤트도 React 트리로 올라오므로, 이 메뉴 바탕 밖(열린 하위 메뉴 안)이면
   * 기다리던 것을 그만두고, 이 메뉴의 항목 위면 그 항목으로 타이머를 건다. 항목이 아닌 곳(구분선, 바탕 여백)은 그대로 둔다.
   * @param event 포인터 이벤트
   */
  function handlePointerOver(event: PointerEvent<HTMLDivElement>): void {
    if (event.pointerType === 'touch' || !(event.target instanceof Element)) {
      return;
    }
    if (!event.currentTarget.contains(event.target)) {
      cancelPending();
      return;
    }
    if (event.target.closest('[role^="menuitem"]') === null) {
      return;
    }
    hoverEntry(
      event.target.closest(`[${SUBMENU_KEY_ATTRIBUTE}]`)?.getAttribute(SUBMENU_KEY_ATTRIBUTE) ??
        null,
    );
  }

  /** 마우스가 메뉴 밖으로 나가면 기다리던 여닫기를 그만둔다. 열린 하위 메뉴로 들어가는 것은 React 트리 안이라 나가는 것이 아니다. */
  function handlePointerLeave(): void {
    cancelPending();
  }

  /**
   * 마우스로 하위 메뉴 항목을 누르면 기다리지 않고 바로 연다. Base UI는 마우스를 올려 여는 항목의 마우스 누름을 받지 않는다.
   * @param event 포인터 이벤트
   */
  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (
      event.pointerType === 'touch' ||
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      !event.currentTarget.contains(event.target)
    ) {
      return;
    }
    const key = event.target
      .closest(`[${SUBMENU_KEY_ATTRIBUTE}]`)
      ?.getAttribute(SUBMENU_KEY_ATTRIBUTE);
    if (key !== undefined && key !== null) {
      showSubmenu(key);
    }
  }

  return (
    <Menu
      className={menuWidthClassNames[width ?? DEFAULT_MENU_WIDTH]}
      onPointerOver={handlePointerOver}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
    >
      {hasCommandBar && !isOpenedAbove && (
        <>
          <CommandBarEntry buttons={buttons} />
          <MenuSeparator />
        </>
      )}
      {listItems.map(
        /**
         * 메뉴 한 줄을 그린다.
         * @param entry 메뉴 한 줄
         * @param index 순서
         * @returns 메뉴 요소
         */
        (entry, index) => {
          const key = entryKey(entry, index);
          return (
            <MenuEntry
              key={key}
              entry={entry}
              submenu={{
                key,
                isOpen: openSubmenuKey === key,
                onOpenChange: (isOpen: boolean) => {
                  if (isOpen) {
                    showSubmenu(key);
                  } else if (openSubmenuKey === key) {
                    showSubmenu(null);
                  }
                },
              }}
            />
          );
        },
      )}
      {hasCommandBar && isOpenedAbove && (
        <>
          <MenuSeparator />
          <CommandBarEntry buttons={buttons} />
        </>
      )}
    </Menu>
  );
}

/** 하위 메뉴 항목이 받는 열림 상태. MenuPanel이 이 메뉴의 하위 메뉴를 하나만 열도록 정한다. */
type SubmenuControl = {
  key: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

/**
 * 메뉴 한 줄의 React key를 만든다. 구분선은 순서로, 라디오 묶음은 첫 선택지 값으로, 나머지는 이름으로 구분한다.
 * @param entry 메뉴 한 줄
 * @param index 순서
 * @returns React key
 */
function entryKey(entry: MenuPopupListEntry, index: number): string {
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
 * @param props.submenu 하위 메뉴 항목일 때의 열림 상태
 */
function MenuEntry({
  entry,
  submenu,
}: {
  entry: MenuPopupListEntry;
  submenu: SubmenuControl;
}): JSX.Element {
  switch (entry.kind) {
    case 'separator':
      // 메뉴 안쪽 너비를 채우는 구분선(피그마 MenuSeparator)이다. 너비는 메뉴 바탕(Flyout)이 채운다.
      return <MenuSeparator />;
    case 'submenu':
      return <SubmenuEntry entry={entry} control={submenu} />;
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
          icon={entry.icon}
          shortcut={entry.shortcut}
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
                icon={option.icon}
                shortcut={option.shortcut}
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
 * 하위 메뉴를 연 메뉴(부모 메뉴) 안을 눌러 Base UI가 하위 메뉴를 닫으려는지 본다. 부모 메뉴의 다른 하위 메뉴 항목을 누르면 MenuPanel이
 * 그 하위 메뉴로 바로 바꾸므로, 그 전에 닫혀 하위 메뉴가 없는 순간이 생기지 않게 이 닫기는 받지 않는다.
 * @param eventDetails Base UI 여닫기 정보
 * @param eventDetails.reason 여닫는 이유
 * @param eventDetails.event 여닫게 한 이벤트
 * @param eventDetails.trigger 하위 메뉴 항목 요소
 * @returns 부모 메뉴 안을 눌러 닫으려는지
 */
function isPressInParentMenu({
  reason,
  event,
  trigger,
}: {
  reason: string;
  event: Event;
  trigger?: Element;
}): boolean {
  const { target } = event;
  return (
    reason === 'outside-press' &&
    target instanceof Node &&
    (trigger?.closest('[role="menu"]')?.contains(target) ?? false)
  );
}

/**
 * 하위 메뉴 항목을 그린다. 여닫을 하위 메뉴(`entries`)가 있으면 항목 오른쪽에 위를 맞춰 붙이는 실제 하위 메뉴로 그리고,
 * 없으면 닫은 모습으로 그린다. 피그마 조립은 하위 메뉴를 닫은 모양으로만 그린다.
 * 실제 하위 메뉴의 열림은 MenuPanel이 정한다(Base UI `SubmenuRoot`의 `open` 제어). Base UI가 마우스를 올리거나 벗어나 여닫으려는 것은
 * 받지 않고, 키보드·Esc·바깥 누르기처럼 그 밖의 이유는 그대로 따른다.
 * @codocs [[디자인 시스템:팝업]]
 * @param props 컴포넌트 속성
 * @param props.entry 하위 메뉴 항목
 * @param props.control 열림 상태
 */
function SubmenuEntry({
  entry,
  control,
}: {
  entry: MenuPopupSubmenu;
  control: SubmenuControl;
}): JSX.Element {
  if (entry.entries !== undefined) {
    const { onOpenChange: handleOpenChange } = control;
    return (
      // 실제 하위 메뉴다. 피그마 Popover `Right-Start`처럼 항목 오른쪽에 위를 맞춰 간격(spacing/4)을 두고 붙인다.
      <BaseMenu.SubmenuRoot
        open={control.isOpen}
        onOpenChange={
          /**
           * Base UI가 하위 메뉴를 여닫으려 할 때 마우스로 여닫는 것은 막고, 그 밖의 이유는 MenuPanel에 알린다.
           * @param isOpen 열려는지
           * @param eventDetails Base UI 여닫기 정보
           */
          (isOpen, eventDetails) => {
            if (
              pointerOpenChangeReasons.has(eventDetails.reason) ||
              isPressInParentMenu(eventDetails)
            ) {
              eventDetails.cancel();
              return;
            }
            handleOpenChange(isOpen);
          }
        }
      >
        {/* 마우스가 어느 하위 메뉴 항목 위에 있는지 MenuPanel이 찾는 표시다. 배치에 끼지 않는다. */}
        <div className="contents" {...{ [SUBMENU_KEY_ATTRIBUTE]: control.key }}>
          <MenuItem
            variant="submenu"
            label={entry.label}
            icon={entry.icon}
            isDisabled={entry.isDisabled}
          />
        </div>
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
