import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type StartCategoryCardItems = 'full' | '3' | '2' | '1';
export type StartCategoryCardDevice = 'desktop' | 'mobile';

type StartCategoryCardProps = Omit<ComponentProps<'div'>, 'children'> & {
  items?: StartCategoryCardItems;
  device?: StartCategoryCardDevice;
  icon1: ReactNode;
  icon2?: ReactNode;
  icon3?: ReactNode;
  group?: ReactNode;
  label?: string;
};

// 피그마 Items 값마다 그리는 큰 아이콘 수다. 남은 칸은 빈 칸이고, Full만 넷째 칸에 Group을 둔다.
const ICON_COUNTS = { full: 3, '3': 3, '2': 2, '1': 1 } as const;

// 피그마 Device 값마다 바뀌는 여백·간격·아이콘 자리 크기다.
const DEVICE_CLASS_NAMES = {
  desktop: {
    tile: 'gap-spacing-lg p-spacing-xl',
    row: 'gap-spacing-lg',
    cell: 'size-size-icon-xl',
    smallIcon: '[&>*]:size-size-icon-sm',
  },
  mobile: {
    tile: 'gap-spacing-md p-spacing-md',
    row: 'gap-spacing-md',
    cell: 'size-size-icon-lg',
    smallIcon: '[&>*]:size-size-icon-xs',
  },
} as const;

/**
 * Start 모두의 범주 보기에서 범주 하나를 보여 주는 카드(피그마 StartCategoryCard)다.
 * 2×2 칸에 큰 아이콘 3개와 나머지 항목을 작게 모은 묶음(Group)을 놓고, 카드 아래에 범주 이름을 쓴다.
 * 항목이 3개 이하면(Items=3·2·1) 큰 아이콘을 앞에서부터 놓고 남은 칸은 비운다.
 * 마우스를 올리면 카드 바탕이 바뀐다(State=Hover). 카드·아이콘을 눌렀을 때의 동작은 쓰는 곳이 준다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props 컴포넌트 속성
 * @param props.items 피그마 `Items` 변형. 큰 아이콘 수와 Group을 고른다. `full`은 큰 아이콘 3개와 Group, `3`·`2`·`1`은 그 수만큼 큰 아이콘만 둔다
 * @param props.device 피그마 `Device` 변형. 카드 여백과 아이콘 크기를 고른다
 * @param props.icon1 피그마 `Icon 1` 속성(인스턴스 교체). 첫째 칸의 큰 아이콘이다. 항목마다 달라 꼭 넘긴다
 * @param props.icon2 피그마 `Icon 2` 속성(인스턴스 교체). 둘째 칸의 큰 아이콘이다. `items`가 `2` 이상일 때 그린다
 * @param props.icon3 피그마 `Icon 3` 속성(인스턴스 교체). 셋째 칸의 큰 아이콘이다. `items`가 `3`·`full`일 때 그린다
 * @param props.group 피그마 `Group` 슬롯. `items`가 `full`일 때 넷째 칸에 나머지 항목의 작은 아이콘을 넣는다. 작은 아이콘은 2열로 감싸 놓이고 크기는 카드가 정한다
 * @param props.label 피그마 `Label` 속성. 카드 아래 범주 이름이다. 넘치면 한 줄에서 말줄임한다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function StartCategoryCard({
  items = 'full',
  device = 'desktop',
  icon1,
  icon2,
  icon3,
  group,
  label = '범주 이름',
  className,
  ...divProps
}: StartCategoryCardProps): JSX.Element {
  const classNames = DEVICE_CLASS_NAMES[device];
  const iconCount = ICON_COUNTS[items];
  const icons = [icon1, icon2, icon3];
  const cellClassName = cn(
    'shrink-shrink-none [&>*]:size-full [&>*]:object-contain',
    classNames.cell,
  );

  /**
   * 2×2 칸 가운데 하나를 그린다. 큰 아이콘 자리, Group 자리, 빈 칸 가운데 하나다.
   * @param index 칸 순서(0~3)
   * @returns 칸
   */
  function renderCell(index: number): JSX.Element {
    if (index < iconCount) {
      return (
        <span key={index} className={cellClassName}>
          {icons[index]}
        </span>
      );
    }
    if (index === 3 && items === 'full') {
      return (
        <span
          key={index}
          className={cn(
            'flex shrink-shrink-none flex-wrap content-start items-start',
            classNames.cell,
            classNames.smallIcon,
            '[&>*]:object-contain',
          )}
        >
          {group}
        </span>
      );
    }
    return <span key={index} aria-hidden className={cn('shrink-shrink-none', classNames.cell)} />;
  }

  return (
    <div {...divProps} className={cn('group flex flex-col items-center gap-spacing-sm', className)}>
      <div
        className={cn(
          'flex flex-col items-start rounded-radius-overlay border-stroke-width-default border-color-black-6 bg-color-white-70',
          'motion-control-state group-hover:bg-color-gray-3-50',
          classNames.tile,
        )}
      >
        <div className={cn('flex items-start', classNames.row)}>
          {renderCell(0)}
          {renderCell(1)}
        </div>
        <div className={cn('flex items-start', classNames.row)}>
          {renderCell(2)}
          {renderCell(3)}
        </div>
      </div>
      <p className="w-full truncate text-center type-caption text-color-black-89">{label}</p>
    </div>
  );
}
