import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { ScrollArea } from '../scroll-area/scroll-area';

export type SearchResultsDevice = 'desktop' | 'mobile';

type SearchResultsProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** 피그마 Device. desktop은 결과 목록 옆에 카드를, mobile은 카드를 위에 두고 넘치면 함께 스크롤한다 */
  device?: SearchResultsDevice;
  /**
   * 안쪽 BestMatchCard. 피그마에서 카드는 SearchResults 안에 놓인 인스턴스이고, 카드의 속성(`Title`, `Meta`)과 `Actions` 슬롯은 조립이 바로 채운다.
   * 카드의 속성과 슬롯을 SearchResults가 다시 열지 않는다. 카드 크기 클래스(데스크톱은 줄어들지 않게, 모바일은 너비 채움)는 쓰는 곳이 카드에 준다
   */
  card: ReactNode;
  /** 피그마 `Results` 슬롯. 검색 결과 목록(ListGroup 등)을 넣는다 */
  children?: ReactNode;
};

/**
 * 검색 결과 화면의 틀(피그마 SearchResults)을 그린다. 가장 일치하는 결과 카드(BestMatchCard)는 `card`로 받아 놓는다.
 * 데스크톱은 결과 목록(너비 300) 옆에 카드를, 모바일은 카드 아래에 결과 목록을 두고 ScrollArea로 감싸, 넘칠 때만 Scrollbar가 겹쳐 나온다.
 * 크기는 쓰는 곳이 정한다(피그마 원본 574×545, 356×465는 미리보기 크기다).
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function SearchResults(props: SearchResultsProps): JSX.Element {
  const { device = 'desktop', card, children, className, ...divProps } = props;
  if (device === 'mobile') {
    return (
      <ScrollArea {...divProps} className={cn('size-full rounded-radius-control', className)}>
        <div className="flex shrink-shrink-none flex-col items-start gap-spacing-lg">
          {card}
          <div className="flex w-full shrink-shrink-none flex-col gap-spacing-2xs">{children}</div>
        </div>
      </ScrollArea>
    );
  }
  return (
    <div {...divProps} className={cn('flex size-full items-stretch gap-spacing-lg', className)}>
      <div className="flex w-size-search-results-list-width shrink-shrink-none flex-col gap-spacing-2xs">
        {children}
      </div>
      {card}
    </div>
  );
}
