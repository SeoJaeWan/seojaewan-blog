import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SectionHeaderProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Label 속성. 머리글 글자다 */
  label?: string;
};

/**
 * 목록 안 항목 묶음의 머리글(피그마 SectionHeader)을 그린다. Start 메뉴 목록과 검색 결과에 쓴다.
 * 너비는 글자에 맞춘다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function SectionHeader(props: SectionHeaderProps): JSX.Element {
  const { label = '머리글', className, ...divProps } = props;
  return (
    <div {...divProps} className={cn('flex items-start overflow-clip px-12 pt-8 pb-4', className)}>
      <p className="shrink-0 type-body-strong whitespace-nowrap text-text-fill-primary">{label}</p>
    </div>
  );
}
