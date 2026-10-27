import { type ComponentProps, type JSX, type MouseEventHandler, useState } from 'react';

import { Button, IconButton, Separator } from '@seojaewan/design-system';

import { MenuButton } from '@/shared/components/menu-button/menu-button';
import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

export type ExplorerCommandsLocation = 'folder' | 'recycle-bin';
export type ExplorerCommandsDevice = 'desktop' | 'mobile';

type IconName = NonNullable<ComponentProps<typeof IconButton>['icon']>;

/** 명령 버튼마다 누를 때 부르는 동작 prop 이름 */
export type ExplorerCommandName =
  | 'onNew'
  | 'onCut'
  | 'onPaste'
  | 'onRename'
  | 'onDelete'
  | 'onRestore'
  | 'onEmptyRecycleBin'
  | 'onSort'
  | 'onView';

type CommandHandlers = Partial<Record<ExplorerCommandName, MouseEventHandler<HTMLButtonElement>>>;

type ExplorerCommandsProps = CommandHandlers & {
  /** 피그마 Location. folder는 폴더 명령, recycle-bin은 휴지통 명령이다 */
  location?: ExplorerCommandsLocation;
  /** 피그마 Device. desktop은 글자 있는 버튼을 쓰고, mobile은 모두 아이콘 버튼이다 */
  device?: ExplorerCommandsDevice;
  /** 지금 쓸 수 없어 비활성(Button·IconButton disabled)으로 둘 명령 */
  disabledCommands?: readonly ExplorerCommandName[];
  /** 정렬 버튼이 여는 메뉴 항목. 주면 정렬 버튼을 누를 때 메뉴를 연다 */
  sortMenu?: readonly MenuPopupEntry[];
  /** 보기 버튼이 여는 메뉴 항목. 주면 보기 버튼을 누를 때 메뉴를 연다 */
  viewMenu?: readonly MenuPopupEntry[];
  /** 바깥 배치 클래스 */
  className?: string;
};

/** 명령 버튼 하나 */
type Command = {
  /** 누를 때 부르는 동작 prop 이름 */
  handler: ExplorerCommandName;
  /** desktop 버튼 글자이자 접근성 이름 */
  label: string;
  icon: IconName;
  /** desktop에서 글자 있는 Button으로 그린다. 아니면 IconButton이다 */
  isLabeledOnDesktop: boolean;
};

/** 명령 버튼 사이 구분선. `desktop-separator`는 desktop에만 그린다 */
type CommandSeparator = 'separator' | 'desktop-separator';

// 피그마 조립 Explorer/Commands의 버튼 순서·이름·아이콘이다. 위치마다 쓸 수 있는 명령이 정해져 있어 데이터가 아니라 조립의 일부다.
const commandsByLocation = {
  folder: [
    {
      handler: 'onNew',
      label: '새로 만들기',
      icon: 'icons/ic_fluent_add_20_regular.svg',
      isLabeledOnDesktop: true,
    },
    // 모바일은 새로 만들기 뒤 구분선이 없다(피그마 `Location=Folder, Device=Mobile`).
    'desktop-separator',
    {
      handler: 'onCut',
      label: '잘라내기',
      icon: 'icons/ic_fluent_cut_20_regular.svg',
      isLabeledOnDesktop: false,
    },
    {
      handler: 'onPaste',
      label: '붙여넣기',
      icon: 'icons/ic_fluent_clipboard_paste_20_regular.svg',
      isLabeledOnDesktop: false,
    },
    {
      handler: 'onRename',
      label: '이름 바꾸기',
      icon: 'icons/ic_fluent_rename_20_regular.svg',
      isLabeledOnDesktop: false,
    },
    {
      handler: 'onDelete',
      label: '삭제',
      icon: 'icons/ic_fluent_delete_20_regular.svg',
      isLabeledOnDesktop: false,
    },
    'separator',
    {
      handler: 'onSort',
      label: '정렬',
      icon: 'icons/ic_fluent_arrow_sort_20_regular.svg',
      isLabeledOnDesktop: true,
    },
    {
      handler: 'onView',
      label: '보기',
      icon: 'icons/ic_fluent_grid_20_regular.svg',
      isLabeledOnDesktop: true,
    },
  ],
  'recycle-bin': [
    {
      handler: 'onRestore',
      label: '복원',
      icon: 'icons/ic_fluent_arrow_counterclockwise_20_regular.svg',
      isLabeledOnDesktop: true,
    },
    {
      handler: 'onEmptyRecycleBin',
      label: '휴지통 비우기',
      icon: 'icons/ic_fluent_delete_20_regular.svg',
      isLabeledOnDesktop: true,
    },
    'separator',
    {
      handler: 'onSort',
      label: '정렬',
      icon: 'icons/ic_fluent_arrow_sort_20_regular.svg',
      isLabeledOnDesktop: true,
    },
    {
      handler: 'onView',
      label: '보기',
      icon: 'icons/ic_fluent_grid_20_regular.svg',
      isLabeledOnDesktop: true,
    },
  ],
} as const satisfies Record<ExplorerCommandsLocation, readonly (Command | CommandSeparator)[]>;

// 모바일의 새로 만들기는 글자 없이 새 폴더 아이콘으로 바꾼다(피그마 `new folder`).
const MOBILE_NEW_ICON: IconName = 'icons/ic_fluent_folder_add_20_regular.svg';

/**
 * 탐색기 명령 막대(ExplorerCommandBar)의 Commands 자리에 넣는 명령 버튼 묶음(피그마 조립 `Explorer/Commands`)을 그린다.
 * 쓸 수 없는 명령은 비활성으로 그린다. 정렬·보기는 메뉴 항목을 주면 버튼 아래에 그 메뉴를 연다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[파일 탐색기:구성]]
 * @param props
 */
export function ExplorerCommands(props: ExplorerCommandsProps): JSX.Element {
  const {
    location = 'folder',
    device = 'desktop',
    disabledCommands = [],
    sortMenu,
    viewMenu,
    className,
    ...handlers
  } = props;
  const isDesktop = device === 'desktop';
  const [openMenu, setOpenMenu] = useState<'onSort' | 'onView' | null>(null);
  const menus = { onSort: sortMenu, onView: viewMenu } as const;
  return (
    <div className={['flex w-fit items-center gap-4', className].filter(Boolean).join(' ')}>
      {commandsByLocation[location].map(
        /**
         * 명령 버튼이나 구분선 하나를 그린다.
         * @param command 명령이나 구분선
         * @param index 순서
         * @returns 버튼, 구분선, 또는 그리지 않음
         */
        (command, index) => {
          if (command === 'desktop-separator' && !isDesktop) {
            return null;
          }
          if (command === 'separator' || command === 'desktop-separator') {
            // 피그마 Separator 인스턴스의 높이를 24로 덮어쓴 것과 같다.
            return (
              <Separator
                key={`separator-${String(index)}`}
                orientation="vertical"
                className="h-24"
              />
            );
          }
          const handleClick = handlers[command.handler];
          const isDisabled = disabledCommands.includes(command.handler);
          // 피그마 인스턴스가 Button의 최소 너비(size/120)를 지웠다.
          const button =
            isDesktop && command.isLabeledOnDesktop ? (
              <Button
                key={command.handler}
                variant="subtle"
                label={command.label}
                showIcon
                icon={command.icon}
                className="min-w-0"
                disabled={isDisabled}
                onClick={handleClick}
              />
            ) : (
              <IconButton
                key={command.handler}
                variant="subtle"
                label={command.label}
                icon={!isDesktop && command.handler === 'onNew' ? MOBILE_NEW_ICON : command.icon}
                disabled={isDisabled}
                onClick={handleClick}
              />
            );
          const menuName =
            command.handler === 'onSort' || command.handler === 'onView' ? command.handler : null;
          const menu = menuName === null ? undefined : menus[menuName];
          if (menuName === null || menu === undefined) {
            return button;
          }
          return (
            <MenuButton
              key={command.handler}
              trigger={button}
              items={closeOnSelect(menu, () => {
                setOpenMenu(null);
              })}
              open={openMenu === menuName}
              onOpenChange={(isOpen: boolean) => {
                setOpenMenu(isOpen ? menuName : null);
              }}
            />
          );
        },
      )}
    </div>
  );
}

/**
 * 라디오 묶음에서 고르면 메뉴를 닫게 한다(Windows 정렬·보기 메뉴처럼). 명령 항목은 Base UI가 닫는다.
 * @param entries 메뉴 항목
 * @param close 메뉴를 닫는 함수
 * @returns 고르면 닫는 메뉴 항목
 */
function closeOnSelect(
  entries: readonly MenuPopupEntry[],
  close: () => void,
): readonly MenuPopupEntry[] {
  return entries.map(
    /**
     * 라디오 묶음이면 고를 때 메뉴를 닫게 감싼다.
     * @param entry 메뉴 항목
     * @returns 감싼 메뉴 항목
     */
    (entry) =>
      entry.kind === 'radio-group'
        ? {
            ...entry,
            onValueChange: (value: string) => {
              entry.onValueChange?.(value);
              close();
            },
          }
        : entry,
  );
}
