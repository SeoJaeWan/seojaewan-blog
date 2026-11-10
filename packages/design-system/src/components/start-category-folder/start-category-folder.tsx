import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type StartCategoryFolderDevice = 'desktop' | 'mobile';

type StartCategoryFolderProps = Omit<ComponentProps<'div'>, 'children'> & {
  device?: StartCategoryFolderDevice;
  label?: string;
  hasPages?: boolean;
  pageCount?: number;
  currentPage?: number;
  gridProps?: Omit<ComponentProps<'div'>, 'children'>;
  children?: ReactNode;
};

// 피그마 Device 값마다 바뀌는 팝업 너비·가로 여백·쪽 표시 칸 너비와 항목 칸 너비다.
// 쪽 표시 점은 오른쪽 여백 칸의 가운데에 놓이므로, 칸 너비는 가로 여백과 같다.
const deviceClassNames = {
  desktop: {
    root: 'w-size-start-category-folder-width px-spacing-3xl',
    pages: 'w-spacing-3xl',
    tiles: '[&>*]:w-size-start-category-folder-item-width',
  },
  mobile: {
    root: 'w-size-start-category-folder-mobile-width px-spacing-lg',
    pages: 'w-spacing-lg',
    tiles: '[&>*]:w-size-pinned-tile-mobile-width',
  },
} as const satisfies Record<StartCategoryFolderDevice, Record<string, string>>;

/**
 * Start 범주 카드를 누르면 여는 펼침 팝업(피그마 StartCategoryFolder)이다.
 * 아크릴 바탕 위에 가운데 정렬한 범주 이름과 범주의 항목 격자(4열)를 놓는다. 크기는 항목 수와 상관없이 고정이고,
 * 모바일은 너비와 가로 여백만 다르다(@codocs [[Start 메뉴:모두]]).
 * 항목 칸 너비는 팝업이 정하므로 쓰는 곳은 항목에 너비 클래스를 주지 않는다.
 * 넘친 항목은 스크롤바 없이 격자 영역(피그마 `page`) 경계에서 잘린다. 쪽 넘김과 그 움직임은 쓰는 곳이 `gridProps`로 격자(피그마 `tile grid`)를
 * 옮겨 한다. 여닫기(바깥 클릭, Esc)와 놓을 자리도 쓰는 곳이 한다.
 * @codocs [[Start 메뉴:모두]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.device 피그마 `Device` 변형. 팝업 너비, 가로 여백, 항목 칸 너비를 고른다
 * @param props.label 피그마 `Label` 속성. 팝업 위의 범주 이름이다. 넘치면 한 줄에서 말줄임한다
 * @param props.hasPages 피그마 `Has pages` 속성. 격자 오른쪽에 쪽 표시 점을 보일지 정한다
 * @param props.pageCount 쪽 표시 점의 수. 피그마 기본 내용은 3쪽이다
 * @param props.currentPage 크게 보일 지금 쪽(0부터)
 * @param props.gridProps 항목 격자(피그마 `tile grid`) 요소에 줄 속성. 쓰는 곳이 쪽 넘김 위치·모션 클래스·ref를 준다
 * @param props.children 피그마 `Tiles` 슬롯. 범주의 항목(PinnedTile)을 넣는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function StartCategoryFolder({
  device = 'desktop',
  label = '범주 이름',
  hasPages = false,
  pageCount = 3,
  currentPage = 0,
  gridProps,
  children,
  className,
  ...divProps
}: StartCategoryFolderProps): JSX.Element {
  const classNames = deviceClassNames[device];
  return (
    <div
      {...divProps}
      // 피그마에서 테두리가 레이아웃에 들어가지 않으므로 안쪽 선 고리로 그린다.
      className={cn(
        'inner-border-color-black-6 relative flex h-size-start-category-folder-height flex-col items-start gap-spacing-2xl rounded-radius-overlay pt-spacing-4xl pb-spacing-3xl inner-border-w-stroke-width-default',
        'material-acrylic-default surface-flyout-acrylic',
        classNames.root,
        className,
      )}
    >
      <p className="w-full shrink-shrink-none truncate text-center type-subtitle text-color-black-89">
        {label}
      </p>
      {/* 격자 영역(피그마 page). 쪽 표시 점은 이 영역의 오른쪽 여백 칸 세로 가운데에 놓는다.
          격자는 안쪽 틀이 자르고, 쪽 표시 점은 틀 밖(오른쪽 여백 칸)이라 잘리지 않는다.
          자르기는 overflow clip이라 포커스가 옮겨 가도 틀이 스스로 스크롤되지 않는다. */}
      <div className="relative min-h-size-none w-full flex-flex-fill">
        <div className="size-full overflow-clip">
          <div
            {...gridProps}
            className={cn('flex w-full flex-wrap', classNames.tiles, gridProps?.className)}
          >
            {children}
          </div>
        </div>
        {hasPages && (
          <div
            aria-hidden
            className={cn(
              'absolute inset-y-spacing-none left-full flex flex-col items-center justify-center gap-spacing-sm-nudge',
              classNames.pages,
            )}
          >
            {Array.from(
              { length: pageCount },
              /**
               * 쪽 하나의 점을 그린다. 지금 쪽은 크게 그린다.
               * @param _ 쓰지 않는 값
               * @param index 쪽 순서(0부터)
               * @returns 점 칸
               */
              (_, index) => (
                <span
                  key={index}
                  className="flex size-size-start-category-folder-page-dot-current items-center justify-center"
                >
                  <span
                    className={cn(
                      'rounded-radius-circular bg-color-black-45',
                      index === currentPage
                        ? 'size-size-start-category-folder-page-dot-current'
                        : 'size-size-start-category-folder-page-dot',
                    )}
                  />
                </span>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
