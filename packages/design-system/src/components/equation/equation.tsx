import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type EquationProps = ComponentProps<'div'> & {
  children?: ReactNode;
};

/**
 * 글 본문의 블록 수식 자리(피그마 Equation)를 그린다. 수식은 `children` 슬롯으로 채우며,
 * 그리는 일은 서버가 한다(@codocs [[기술 스택:글 본문 처리]]). 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props 컴포넌트 속성
 * @param props.children 피그마 `Formula` 슬롯. 서버가 KaTeX로 그려 보낸 수식을 넣는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Equation({ children, className, ...divProps }: EquationProps): JSX.Element {
  return (
    <div {...divProps} className={cn('flex items-center justify-center py-spacing-sm', className)}>
      {children}
    </div>
  );
}
