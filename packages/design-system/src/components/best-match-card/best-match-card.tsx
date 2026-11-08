import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Separator } from '../separator/separator';

type BestMatchCardProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  icon: ReactNode;
  title?: string;
  meta?: string;
  children?: ReactNode;
};

/**
 * 가장 일치하는 검색 결과의 미리보기 카드(피그마 BestMatchCard)를 그린다. 너비는 Windows가 정한 258이다.
 * 아이콘은 `icon`, 동작 목록은 `children` 슬롯으로 채우고 구분선은 Separator 인스턴스다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[검색:결과 화면]]
 * @param props 컴포넌트 속성
 * @param props.icon 피그마 `Icon` 인스턴스 교체 속성(레이어 `preview icon`). 쓰는 곳마다 다른 미리보기 아이콘이라 필수다
 * @param props.title 피그마 TEXT 속성 Title. 가장 일치하는 결과의 제목이다. 길면 한 줄로 두고 끝을 말줄임한다
 * @param props.meta 피그마 TEXT 속성 Meta. 제목 아래 부가 정보다. 길면 한 줄로 두고 끝을 말줄임한다
 * @param props.children 피그마 `Actions` 슬롯. 구분선 아래에 결과의 동작 목록을 세로로 넣는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function BestMatchCard({
  icon,
  title = '제목',
  meta = '부가 정보',
  children,
  className,
  ...divProps
}: BestMatchCardProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex w-size-best-match-card-width flex-col items-center gap-spacing-sm overflow-clip rounded-radius-overlay border-stroke-width-default border-color-black-6 bg-color-white-70 px-spacing-lg pt-spacing-2xl pb-spacing-lg',
        className,
      )}
    >
      <div className="size-size-icon-3xl shrink-shrink-none [&>*]:size-full [&>*]:object-contain">
        {icon}
      </div>
      <p className="w-full shrink-shrink-none truncate text-center type-subtitle text-color-black-89">
        {title}
      </p>
      <p className="w-full shrink-shrink-none truncate text-center type-caption text-color-black-61">
        {meta}
      </p>
      <Separator className="w-full" />
      <div className="flex w-full shrink-shrink-none flex-col gap-spacing-sm">{children}</div>
    </div>
  );
}
