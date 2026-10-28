import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type QuoteProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `Content` 슬롯. 서식이 섞인 인용 글 블록을 넣는다 */
  children?: ReactNode;
};

/**
 * 글 본문의 인용(피그마 Quote)을 그린다. 인용 내용은 `children` 슬롯으로 채운다.
 * 너비는 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 왼쪽 막대와 색은 토큰 한 가지 모양이다(@codocs [[Chrome:Notion 블록]]).
 * @param props
 */
export function Quote(props: QuoteProps): JSX.Element {
  const { children, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      // 피그마에서 왼쪽 막대가 레이아웃에 들어가므로 CSS border를 쓴다.
      className={cn(
        'flex flex-col items-start border-l-indicator border-control-strong-stroke-default py-2 pr-0 pl-16',
        className,
      )}
    >
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
