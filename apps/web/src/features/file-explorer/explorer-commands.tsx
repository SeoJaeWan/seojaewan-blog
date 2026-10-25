import type { ComponentProps, JSX, MouseEventHandler } from 'react';

import { Button, IconButton, Separator } from '@seojaewan/design-system';

export type ExplorerCommandsLocation = 'folder' | 'recycle-bin';
export type ExplorerCommandsDevice = 'desktop' | 'mobile';

type IconName = NonNullable<ComponentProps<typeof IconButton>['icon']>;

/** 명령 버튼마다 누를 때 부르는 동작 prop 이름 */
type CommandHandlerName =
  | 'onNew'
  | 'onCut'
  | 'onPaste'
  | 'onRename'
  | 'onDelete'
  | 'onRestore'
  | 'onEmptyRecycleBin'
  | 'onSort'
  | 'onView';

type CommandHandlers = Partial<Record<CommandHandlerName, MouseEventHandler<HTMLButtonElement>>>;

type ExplorerCommandsProps = CommandHandlers & {
  /** 피그마 Location. folder는 폴더 명령, recycle-bin은 휴지통 명령이다 */
  location?: ExplorerCommandsLocation;
  /** 피그마 Device. desktop은 글자 있는 버튼을 쓰고, mobile은 모두 아이콘 버튼이다 */
  device?: ExplorerCommandsDevice;
  /** 바깥 배치 클래스 */
  className?: string;
};

/** 명령 버튼 하나 */
type Command = {
  /** 누를 때 부르는 동작 prop 이름 */
  handler: CommandHandlerName;
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
 * 정렬·보기는 지금 모습만 그리고, 메뉴를 여는 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @param props
 */
export function ExplorerCommands(props: ExplorerCommandsProps): JSX.Element {
  const { location = 'folder', device = 'desktop', className, ...handlers } = props;
  const isDesktop = device === 'desktop';
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
          if (isDesktop && command.isLabeledOnDesktop) {
            // 피그마 인스턴스가 Button의 최소 너비(size/120)를 지웠다.
            return (
              <Button
                key={command.handler}
                variant="subtle"
                label={command.label}
                showIcon
                icon={command.icon}
                className="min-w-0"
                onClick={handleClick}
              />
            );
          }
          return (
            <IconButton
              key={command.handler}
              variant="subtle"
              label={command.label}
              icon={!isDesktop && command.handler === 'onNew' ? MOBILE_NEW_ICON : command.icon}
              onClick={handleClick}
            />
          );
        },
      )}
    </div>
  );
}
