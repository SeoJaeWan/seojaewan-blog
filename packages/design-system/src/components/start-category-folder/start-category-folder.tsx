import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { ScrollArea } from '../scroll-area/scroll-area';
import { TileGrid } from '../tile-grid/tile-grid';

type StartCategoryFolderProps = Omit<ComponentProps<'div'>, 'children'> & {
  label?: string;
  children?: ReactNode;
};

/**
 * Start 범주 카드를 누르면 카드 자리 위에 여는 펼침 팝업(피그마 StartCategoryFolder)이다.
 * 아크릴 바탕 위에 범주 이름과 범주의 모든 항목 격자를 놓고, 항목이 넘치면 팝업 안에서 스크롤한다.
 * 피그마 원본 412×236은 견본 크기라 너비와 높이는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 여닫기(바깥 클릭, Esc)와 놓을 자리는 쓰는 곳이 한다.
 * @codocs [[Start 메뉴:모두]]
 * @param props 컴포넌트 속성
 * @param props.label 피그마 `Label` 속성. 팝업 위의 범주 이름이다. 넘치면 한 줄에서 말줄임한다
 * @param props.children 안쪽 TileGrid의 `Tiles` 슬롯. 범주의 항목(PinnedTile)을 넣는다. 피그마처럼 조립이 안쪽 격자를 바로 채운다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function StartCategoryFolder({
  label = '범주 이름',
  children,
  className,
  ...divProps
}: StartCategoryFolderProps): JSX.Element {
  return (
    <div
      {...divProps}
      // 피그마에서 테두리가 레이아웃에 들어가지 않으므로 안쪽 선 고리로 그린다.
      // 쓰는 곳이 준 높이를 넘지 않고 격자가 스크롤하도록 내용 높이로 늘어나지 않게 한다(min-h-size-none).
      className={cn(
        'inner-border-color-black-6 relative flex min-h-size-none flex-col items-start gap-spacing-lg rounded-radius-overlay p-spacing-lg inner-border-w-stroke-width-default',
        'material-acrylic-default surface-flyout-acrylic',
        className,
      )}
    >
      <p className="w-full shrink-shrink-none truncate type-body-strong text-color-black-89">
        {label}
      </p>
      <ScrollArea className="min-h-size-none w-full flex-flex-fill">
        <TileGrid className="w-full">{children}</TileGrid>
      </ScrollArea>
    </div>
  );
}
