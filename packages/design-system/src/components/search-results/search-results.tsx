import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { BestMatchCard } from '../best-match-card/best-match-card';
import { ScrollArea } from '../scrollbar/scroll-area';

export type SearchResultsDevice = 'desktop' | 'mobile';

type SearchResultsProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** 피그마 Device. desktop은 결과 목록 옆에 카드를, mobile은 카드를 위에 두고 넘치면 함께 스크롤한다 */
  device?: SearchResultsDevice;
  /** 피그마 BestMatchCard의 `Icon` 인스턴스 교체 속성을 그대로 넘긴다. 쓰는 곳마다 다른 미리보기 아이콘이라 필수다 */
  icon: ReactNode;
  /** 피그마 BestMatchCard의 TEXT 속성 Title을 그대로 넘긴다 */
  title?: string;
  /** 피그마 BestMatchCard의 TEXT 속성 Meta를 그대로 넘긴다 */
  meta?: string;
  /** 피그마 BestMatchCard 안쪽의 `Actions` 슬롯. 카드 구분선 아래에 동작 목록을 넣는다 */
  actions?: ReactNode;
  /** 피그마 `Results` 슬롯. 검색 결과 목록(ListGroup 등)을 넣는다 */
  children?: ReactNode;
};

/**
 * 검색 결과 화면의 틀(피그마 SearchResults)을 그린다. 가장 일치하는 결과 카드(BestMatchCard)는 인스턴스로 조립한다.
 * 데스크톱은 결과 목록(너비 300) 옆에 카드를, 모바일은 카드 아래에 결과 목록을 두고 ScrollArea로 감싸, 넘칠 때만 Scrollbar가 겹쳐 나온다.
 * 크기는 쓰는 곳이 정한다(피그마 원본 574×545, 356×465는 미리보기 크기다).
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function SearchResults(props: SearchResultsProps): JSX.Element {
  const {
    device = 'desktop',
    icon,
    title,
    meta,
    actions,
    children,
    className,
    ...divProps
  } = props;
  if (device === 'mobile') {
    return (
      <ScrollArea {...divProps} className={cn('size-full rounded-control', className)}>
        <div className="flex shrink-0 flex-col items-start gap-16">
          <BestMatchCard icon={icon} title={title} meta={meta} className="w-full">
            {actions}
          </BestMatchCard>
          <div className="flex w-full shrink-0 flex-col gap-2">{children}</div>
        </div>
      </ScrollArea>
    );
  }
  return (
    <div {...divProps} className={cn('flex size-full items-stretch gap-16', className)}>
      <div className="flex w-300 shrink-0 flex-col gap-2">{children}</div>
      <BestMatchCard icon={icon} title={title} meta={meta} className="shrink-0">
        {actions}
      </BestMatchCard>
    </div>
  );
}
