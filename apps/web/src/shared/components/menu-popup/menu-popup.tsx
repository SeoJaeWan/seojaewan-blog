import { ContextMenu } from '@base-ui/react/context-menu';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import {
  type AnimationEvent,
  type ComponentProps,
  type HTMLProps,
  type JSX,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type TouchEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  IconButton,
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

/**
 * 머리글이 붙은 항목 묶음(작업 표시줄 점프 목록의 "자주 방문"·"작업" 칸). 피그마 메뉴 조립이 Content 안에 직접 그린 머리글(`header <이름>`)
 * 아래에 항목을 둔다. 보조 기술에는 머리글이 이름인 메뉴 묶음으로 알린다.
 */
export type MenuPopupGroup = {
  kind: 'group';
  label: string;
  entries: readonly MenuPopupEntry[];
};

/**
 * 고정한 항목 한 줄(작업 표시줄 탐색기 점프 목록 "고정됨"의 폴더). 모양은 `Variant=Default` 항목이고, 피그마 조립 `hover · Menu/TaskbarJumpListExplorer`처럼
 * 마우스를 올리면 오른쪽 끝에 압정 해제 버튼(`unpinLabel`)이 따로 나온다. 버튼을 누르면 `onUnpin`을 부르고 메뉴는 열어 둔다.
 * id는 같은 이름의 항목끼리 가르는 열쇠다(폴더 id). 줄을 우클릭(길게 누르기, Shift+F10·메뉴 키)하면 그 자리에 `entries`(항목 메뉴)를 띄우고 이 메뉴는 닫지 않는다.
 */
export type MenuPopupPinned = {
  kind: 'pinned';
  id: string;
  label: string;
  icon?: MenuItemIcon;
  unpinLabel: string;
  onClick: () => void;
  onUnpin: () => void;
  entries: readonly MenuPopupEntry[];
};

/** 메뉴 한 줄 */
export type MenuPopupEntry =
  | MenuPopupPinned
  | MenuPopupCommand
  | MenuPopupSubmenu
  | MenuPopupCheckbox
  | MenuPopupRadioGroup
  | MenuPopupZoom
  | MenuPopupSeparator
  | MenuPopupCommandBar
  | MenuPopupGroup;

/** 메뉴 목록에 한 줄로 그리는 항목(단추 줄을 뺀 메뉴 한 줄) */
type MenuPopupListEntry = Exclude<MenuPopupEntry, MenuPopupCommandBar>;

export type MenuPopupWidth = 'default' | 'view-options' | 'taskbar';

// 메뉴 바탕(Menu) 너비다. 피그마 메뉴 조립이 Menu 인스턴스에 연결한 너비 변수로, 기본은 Menu 자신의 너비(size/menu/width)이고
// `Menu/ViewOptions`만 size/menu/view-options-width, 작업 표시줄 앱 메뉴·점프 목록(`Menu/TaskbarApp`, `Menu/TaskbarJumpList*`)은
// size/menu/taskbar-width다. 항목(MenuItem)은 늘 바탕 너비를 채운다.
const menuWidthClassNames = {
  default: undefined,
  'view-options': 'w-size-menu-view-options-width',
  taskbar: 'w-size-menu-taskbar-width',
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

  /**
   * 하위 메뉴 항목 하나의 열림 상태를 만든다. 묶음 안의 하위 메뉴 항목도 같은 메뉴의 하위 메뉴라 여기서 함께 정한다.
   * @param key 하위 메뉴 항목의 key
   * @returns 열림 상태
   */
  function getSubmenuControl(key: string): SubmenuControl {
    return {
      key,
      isOpen: openSubmenuKey === key,
      onOpenChange: (isOpen: boolean) => {
        if (isOpen) {
          showSubmenu(key);
        } else if (openSubmenuKey === key) {
          showSubmenu(null);
        }
      },
    };
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
          return <MenuEntry key={key} id={key} entry={entry} getSubmenu={getSubmenuControl} />;
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

/**
 * 메뉴 한 줄이 목록에 한 줄로 그리는 항목인지(단추 줄이 아닌지) 본다.
 * @param entry 메뉴 한 줄
 * @returns 목록에 그리는 항목이면 true
 */
function isListEntry(entry: MenuPopupEntry): entry is MenuPopupListEntry {
  return entry.kind !== 'command-bar';
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
    case 'group':
      return `group-${entry.label}`;
    case 'pinned':
      return `pinned-${entry.id}`;
    default:
      return entry.label;
  }
}

/**
 * 메뉴 한 줄을 종류에 맞는 MenuItem이나 구분선으로 그린다.
 * @param props 컴포넌트 속성
 * @param props.id 이 메뉴 안에서 이 줄을 가리키는 key. 묶음 안의 줄은 묶음의 key를 앞에 붙인다
 * @param props.entry 메뉴 한 줄
 * @param props.getSubmenu 하위 메뉴 항목의 열림 상태를 key로 얻는다
 */
function MenuEntry({
  id,
  entry,
  getSubmenu,
}: {
  id: string;
  entry: MenuPopupListEntry;
  getSubmenu: (key: string) => SubmenuControl;
}): JSX.Element {
  switch (entry.kind) {
    case 'separator':
      // 메뉴 안쪽 너비를 채우는 구분선(피그마 MenuSeparator)이다. 너비는 메뉴 바탕(Flyout)이 채운다.
      return <MenuSeparator />;
    case 'submenu':
      return <SubmenuEntry entry={entry} control={getSubmenu(id)} />;
    case 'pinned':
      return <PinnedEntry entry={entry} />;
    case 'group':
      return (
        // 피그마 `header <이름>` 프레임: 높이 32(글자 16 + 위아래 spacing/sm), 왼쪽 spacing/lg, Caption 글자 color/black/61이다.
        // 묶음은 항목을 바로 담아 메뉴 바탕의 세로 배치를 그대로 잇는다(`contents`).
        <BaseMenu.Group className="contents">
          <BaseMenu.GroupLabel className="self-stretch truncate px-spacing-lg py-spacing-sm type-caption text-color-black-61 select-none">
            {entry.label}
          </BaseMenu.GroupLabel>
          {entry.entries.filter(isListEntry).map(
            /**
             * 묶음 안의 한 줄을 그린다. 단추 줄은 묶음 안에 두지 않는다.
             * @param child 메뉴 한 줄
             * @param index 순서
             * @returns 메뉴 요소
             */
            (child, index) => {
              const key = `${id}/${entryKey(child, index)}`;
              return <MenuEntry key={key} id={key} entry={child} getSubmenu={getSubmenu} />;
            },
          )}
        </BaseMenu.Group>
      );
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

// 고정 항목 줄. 마우스가 줄(압정 해제 버튼 포함) 위에 있는 동안 줄 전체를 강조 바탕(MenuItem Hover와 같은 color/black/4)으로 칠한다.
// 버튼은 Base UI 메뉴 항목 밖이라 포인터가 버튼으로 가면 Base UI 강조가 풀리므로, 바탕을 묶음 호버로도 칠한다.
const PINNED_ROW_CLASS_NAME = 'group-hover/pinned:[&>span]:bg-color-black-4';

// 압정 해제 버튼. 피그마 `unpin`(IconButton subtle, 줄 오른쪽 끝에서 spacing/xs)이다. 줄과 높이가 같아 위 끝에 맞춘다.
// 마우스를 올렸거나 키보드로 강조한 줄에만 보인다.
const UNPIN_BUTTON_CLASS_NAME =
  'absolute top-spacing-none right-spacing-xs hidden group-hover/pinned:inline-flex group-has-data-highlighted/pinned:inline-flex';

/**
 * 고정 항목 한 줄을 그린다. 누르면 `onClick`을 부르고 메뉴를 닫는 `Variant=Default` 항목에, 마우스 전용 압정 해제 버튼과 항목 메뉴를 붙인다.
 * - 압정 해제 버튼은 창 미리보기 닫기 버튼처럼 마우스 전용이다(`aria-hidden`, Tab·방향키로 닿지 않음). 메뉴 항목 밖에 있어 눌러도 메뉴가 닫히지 않고,
 *   눌러도 포커스를 옮기지 않는다. 키보드는 항목 메뉴의 고정 해제를 쓴다.
 * - 줄을 우클릭(모바일은 길게 누르기, 키보드는 포커스한 항목에서 Shift+F10·메뉴 키)하면 그 자리에 항목 메뉴를 띄운다. 다른 우클릭 메뉴처럼
 *   `ContextMenuArea`로 연다. 메뉴 항목(Base UI `Menu.Item`)이 `render`로 우클릭 영역을 그리므로, 항목의 훅은 이 메뉴 안에서 돌아 방향키·강조·고르기가
 *   이 메뉴에 붙고, 항목 메뉴(ContextMenu.Root)는 항목 요소 안쪽에만 생긴다. ContextMenu.Root로 항목을 감싸면 항목이 항목 메뉴에 붙어 깨진다.
 *   이 메뉴의 팝업 안에서 열려 Base UI가 같은 팝업 묶음의 자식으로 보므로, 항목 메뉴를 쓰는 동안 이 메뉴는 닫히지 않는다. 다른 우클릭 메뉴처럼
 *   항목 메뉴가 열린 동안 이 메뉴는 막힌다(모달). 항목 메뉴가 닫히면 포커스는 그 줄로, 줄이 사라졌으면(고정 해제) 이 메뉴로 돌아온다.
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[반응형:입력 차이]]
 * @codocs [[접근성:역할]]
 * @codocs [[접근성:포커스]]
 * @param props 컴포넌트 속성
 * @param props.entry 고정 항목
 */
function PinnedEntry({ entry }: { entry: MenuPopupPinned }): JSX.Element {
  const { onClick: handleClick, onUnpin } = entry;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /**
   * 압정 해제 버튼을 누르면 목록에서 뺀다.
   * @param event 누르기 이벤트
   */
  function handleUnpinClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onUnpin();
  }

  /**
   * 항목 메뉴를 열거나 닫는다.
   * @param isOpen 열리려는지
   */
  function handleMenuOpenChange(isOpen: boolean): void {
    setIsMenuOpen(isOpen);
  }

  /**
   * 항목 요소를 우클릭 영역으로 그린다. Base UI가 넘긴 항목 속성(역할, ref, 이벤트)을 영역 요소에 그대로 준다.
   * @param itemProps Base UI 메뉴 항목 속성
   * @returns 항목 메뉴가 붙은 항목 요소
   */
  function renderItem(itemProps: HTMLProps<HTMLDivElement>): ReactElement {
    return (
      <ContextMenuArea
        area={<div {...itemProps} />}
        isOpen={isMenuOpen}
        onOpenChange={handleMenuOpenChange}
        items={entry.entries}
      />
    );
  }

  return (
    <div className="group/pinned relative flex w-full flex-col">
      <MenuItem
        label={entry.label}
        icon={entry.icon}
        onClick={handleClick}
        className={PINNED_ROW_CLASS_NAME}
        render={renderItem}
      />
      <IconButton
        variant="subtle"
        label={entry.unpinLabel}
        icon={UNPIN_ICON}
        aria-hidden
        tabIndex={-1}
        onMouseDown={handleUnpinMouseDown}
        onClick={handleUnpinClick}
        className={UNPIN_BUTTON_CLASS_NAME}
      />
    </div>
  );
}

// 압정 해제 아이콘(피그마 `unpin`의 ic_fluent_pin_off_20_regular)이다.
const UNPIN_ICON = 'icons/ic_fluent_pin_off_20_regular.svg';

/**
 * 마우스 전용 버튼을 눌러도 포커스를 옮기지 않는다. 포커스는 메뉴 안에 그대로 둔다.
 * @param event 누르기 이벤트
 */
function handleUnpinMouseDown(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
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

/**
 * 한 틱 뒤에 포커스를 잃었으면(문서 끝) 그 요소로 포커스를 준다. 사라진 요소가 문서에서 빠진 다음에 보기 위해 미룬다.
 * @param element 포커스를 줄 요소. 없거나 문서에서 빠졌으면 아무것도 하지 않는다
 */
function focusIfLostLater(element: HTMLElement | null): void {
  /** 포커스를 잃었으면 요소로 준다. */
  function focusIfLost(): void {
    const activeElement = document.activeElement;
    const isFocusLost = activeElement === null || activeElement === document.body;
    if (isFocusLost && element?.isConnected === true) {
      element.focus();
    }
  }
  window.setTimeout(focusIfLost, 0);
}

/** 메뉴를 영역 요소에 붙이는 자리(피그마 Popover Placement). side는 영역의 위(top)나 아래(bottom)에 붙고, align은 영역의 시작(start)·가운데(center)·끝(end)에 맞추며, offset은 영역과 메뉴 사이 간격(px)이다. 열 때마다 계산하는 간격(토큰 CSS 변수에서 읽는 값)은 함수로 넘긴다. */
export type ContextMenuAreaPlacement = {
  side: 'top' | 'bottom';
  align: 'start' | 'center' | 'end';
  offset: number | (() => number);
};

type ContextMenuAreaProps = Pick<ComponentProps<typeof MenuPopup>, 'items' | 'width'> & {
  area: ReactElement;
  placement?: ContextMenuAreaPlacement;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean, target: Element | null) => void;
  onCloseComplete?: () => void;
};

/**
 * 영역을 우클릭하거나 길게 누르면(500ms, Base UI) 누른 자리 옆에 메뉴 조립(`Menu/*`)을 띄운다.
 * 바탕화면과 탐색기의 빈 곳·항목 메뉴에 쓴다. 메뉴 내용은 쓰는 곳이 연 자리(`target`)를 보고 정한다.
 * 키보드(Shift+F10, 메뉴 키)로 연 메뉴는 브라우저가 포커스된 요소에 보내는 `contextmenu` 이벤트로 열린다.
 * 닫힌 뒤 포커스는 Base UI가 옮기지 않고 여기서 정한다. 닫히고 나서 `onCloseComplete`를 부르고, 포커스가 갈 곳을 잃었으면(문서 끝)
 * 메뉴를 열 때 포커스가 있던 요소로 돌려준다. Base UI가 돌려주면 그 포커스가 메뉴 항목이 띄운 입력창(이름 바꾸기)보다 늦게 와
 * 입력창을 닫기 때문이다. 바깥을 눌러 닫았으면 누른 곳의 포커스를 그대로 둔다. 닫기가 끝난 때 포커스가 아직 사라질 팝업 안에 있어도(Esc) 잃은 것으로 본다.
 * 그 요소가 사라졌으면(메뉴 항목이 영역을 없앰) 영역을 담은 가장 가까운 포커스 받는 요소(점프 목록 팝업 등)로 돌려준다.
 * 길게 눌러 열었으면 그 손가락의 touchend 기본 동작을 막아 따라오는 클릭(mousedown·click)이 생기지 않게 한다.
 * 메뉴 안(이 메뉴가 품은 항목 메뉴)에서 뗀 mouseup이 Base UI의 "여는 동작 취소"(`cancel-open`)로 이 메뉴를 닫으려 하면 막는다.
 * 메뉴 항목도 영역이 될 수 있다(점프 목록 고정 항목의 항목 메뉴). 이때는 항목이 `render`로 이 컴포넌트를 그려 항목의 훅은 바깥 메뉴에 붙는다.
 * `placement`를 주면 누른 자리 대신 영역 요소에 붙여 연다(모바일 길게 누르기도 같다).
 * 팝업은 문서 끝(body)에 포털해 영역의 `overflow`에 잘리지 않게 한다.
 * 화면 아래쪽에서 열어 아래에 자리가 모자라면 위로 뒤집혀 열린다(`collisionAvoidance`의 `side: 'flip'`). 위로 열리면 `MenuPopup`이 Base UI `side`를 보고
 * 단추 줄을 메뉴 맨 아래에 둔다. 작업 표시줄 앱 메뉴(`placement`의 side가 top)는 처음부터 위로 열리므로 그대로다.
 * `MenuPopup`과 서로를 그리므로(메뉴 항목의 항목 메뉴) 같은 파일에 둔다.
 * @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
 * @codocs [[바탕화면 우클릭 메뉴:아이콘]]
 * @codocs [[반응형:입력 차이]]
 * @codocs [[작업 표시줄:우클릭 메뉴]]
 * @codocs [[접근성:포커스]]
 * @param props 컴포넌트 속성
 * @param props.area 우클릭(모바일은 길게 누르기)을 받는 영역 요소. Base UI `ContextMenu.Trigger`가 이 요소에 여는 동작을 합쳐 그린다. 요소의 ref와 이벤트 속성은 그대로 남는다
 * @param props.placement 주면 메뉴를 누른 자리가 아니라 영역 요소에 붙인다(작업 표시줄 앱 버튼처럼 메뉴가 버튼 위 가운데에 붙는 경우). 주지 않으면 누른 자리 옆에 띄운다
 * @param props.isOpen 메뉴가 열렸는지. 쓰는 곳이 정한다
 * @param props.onOpenChange 메뉴를 열거나 닫으려 할 때 부른다(우클릭, 길게 누르기, Esc, 바깥 클릭, 항목 고르기). 쓰는 곳이 `isOpen`을 바꾼다. 열 때는 우클릭·길게 누른 자리의 요소(`target`)를 함께 넘겨, 쓰는 곳이 어떤 메뉴를 보일지 정하게 한다
 * @param props.onCloseComplete 메뉴가 닫힌 뒤 부른다. 메뉴 항목이 다른 곳에 포커스를 줄 일(이름 바꾸기 입력창)은 여기서 시작한다. 그 뒤 포커스가 갈 곳이 없으면 메뉴를 열 때 포커스가 있던 요소로 돌아간다
 * @param props.items 메뉴 항목과 구분선. 위에서부터 그린다
 * @param props.width 메뉴 바탕 너비(피그마 메뉴 조립의 Menu 너비). 없으면 Menu 기본 너비다
 */
export function ContextMenuArea({
  area,
  placement,
  isOpen,
  onOpenChange,
  onCloseComplete,
  items,
  width,
}: ContextMenuAreaProps): JSX.Element {
  const [returnFocusElement, setReturnFocusElement] = useState<HTMLElement | null>(null);
  const [areaElement, setAreaElement] = useState<HTMLElement | null>(null);
  // 영역을 담은 가장 가까운 포커스 받는 요소(점프 목록 팝업, 목록). 포커스를 가졌던 요소가 사라지면 여기로 돌린다.
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
  const positionerRef = useRef<HTMLDivElement>(null);
  const containerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    containerElementRef.current = containerElement;
  }, [containerElement]);

  useEffect(
    /**
     * 메뉴 항목이 영역 자체를 없애면(점프 목록에서 고정 해제) 닫기가 끝나기 전에 이 컴포넌트가 사라져 닫힌 뒤의 포커스 복귀가 돌지 않는다.
     * 그래서 사라질 때, 포커스를 잃었으면(문서 끝) 영역을 담은 요소로 돌린다. 요소가 문서에서 빠진 다음에 보도록 한 틱 미룬다.
     * @returns 사라질 때 포커스를 돌리는 정리 함수
     */
    () => {
      const containerRef = containerElementRef;
      return () => {
        focusIfLostLater(containerRef.current);
      };
    },
    [],
  );

  // 길게 눌러 메뉴를 연 손가락이 아직 닿아 있는지. 그 손가락을 뗄 때 따라오는 클릭을 막는다.
  const isLongPressOpenRef = useRef(false);

  /**
   * 길게 눌러 메뉴를 연 손가락을 떼면 기본 동작을 막아, 브라우저가 이어 보내는 mousedown·click(따라오는 클릭)이 생기지 않게 한다.
   * 막지 않으면 그 클릭이 메뉴 바깥을 누른 것으로 잡혀 이 메뉴를 품은 메뉴(점프 목록)가 닫히거나, 누른 자리의 항목이 열린다.
   * @param event 터치 끝 이벤트
   */
  function handleTouchEnd(event: TouchEvent): void {
    if (isLongPressOpenRef.current) {
      event.preventDefault();
    }
    isLongPressOpenRef.current = false;
  }

  /**
   * 열림이 바뀐 것을 연 자리와 함께 쓰는 곳에 알린다.
   * @param isNextOpen 바뀐 열림 여부
   * @param details Base UI가 넘기는 바뀐 까닭과 이벤트
   */
  function handleOpenChange(
    isNextOpen: boolean,
    details: ContextMenu.Root.ChangeEventDetails,
  ): void {
    const target = details.event.target;
    if (
      !isNextOpen &&
      details.reason === 'cancel-open' &&
      target instanceof Element &&
      target.closest('[role="menu"]') !== null
    ) {
      details.cancel();
      return;
    }
    if (isNextOpen) {
      isLongPressOpenRef.current = details.event.type.startsWith('touch');
      const focused = document.activeElement;
      setReturnFocusElement(focused instanceof HTMLElement ? focused : null);
      setContainerElement(areaElement?.parentElement?.closest<HTMLElement>('[tabindex]') ?? null);
    }
    onOpenChange(isNextOpen, target instanceof Element ? target : null);
  }

  /**
   * 열고 닫기가 끝나면, 닫힌 경우 쓰는 곳에 알린다.
   * @param isNextOpen 끝난 열림 여부
   */
  function handleOpenChangeComplete(isNextOpen: boolean): void {
    if (isNextOpen) {
      return;
    }
    onCloseComplete?.();
    // 닫기가 끝난 때 포커스가 아직 곧 사라질 팝업 안에 남아 있으면(Esc로 닫음) 잃은 것과 같다.
    const activeElement = document.activeElement;
    const isFocusLost =
      activeElement === null ||
      activeElement === document.body ||
      positionerRef.current?.contains(activeElement) === true;
    if (!isFocusLost) {
      return;
    }
    if (returnFocusElement?.isConnected === true) {
      returnFocusElement.focus();
    } else if (containerElement?.isConnected === true) {
      containerElement.focus();
    }
  }

  return (
    <ContextMenu.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <ContextMenu.Trigger ref={setAreaElement} render={area} onTouchEnd={handleTouchEnd} />
      <ContextMenu.Portal container={getMenuPortalContainer()}>
        <ContextMenu.Positioner
          ref={positionerRef}
          anchor={placement === undefined ? undefined : areaElement}
          side={placement?.side}
          align={placement?.align}
          sideOffset={placement?.offset}
          collisionAvoidance={{ side: 'flip' }}
        >
          <MenuPopup items={items} width={width} finalFocus={false} />
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
