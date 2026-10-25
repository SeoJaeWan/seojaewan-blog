import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Separator } from '../separator/separator';

type BestMatchCardProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 `Icon` 인스턴스 교체 속성(레이어 `preview icon`). 쓰는 곳마다 다른 미리보기 아이콘이라 필수다 */
  icon: ReactNode;
  /** 피그마 TEXT 속성 Title. 가장 일치하는 결과의 제목이다 */
  title?: string;
  /** 피그마 TEXT 속성 Meta. 제목 아래 부가 정보다 */
  meta?: string;
  /** 피그마 `Actions` 슬롯. 구분선 아래에 결과의 동작 목록을 넣는다 */
  children?: ReactNode;
};

/**
 * 가장 일치하는 검색 결과의 미리보기 카드(피그마 BestMatchCard)를 그린다. 너비는 Windows가 정한 258이다.
 * 아이콘은 `icon`, 동작 목록은 `children` 슬롯으로 채우고 구분선은 Separator 인스턴스다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function BestMatchCard(props: BestMatchCardProps): JSX.Element {
  const { icon, title = '제목', meta = '부가 정보', children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex w-258 flex-col items-center gap-8 overflow-clip rounded-overlay border-default border-card-stroke-default bg-card-background-fill-default px-16 pt-24 pb-16',
        className,
      )}
    >
      <div className="size-64 shrink-0">{icon}</div>
      <p className="shrink-0 type-subtitle whitespace-nowrap text-text-fill-primary">{title}</p>
      <p className="shrink-0 type-caption whitespace-nowrap text-text-fill-secondary">{meta}</p>
      <Separator className="w-full" />
      <div className="shrink-0">{children}</div>
    </div>
  );
}
