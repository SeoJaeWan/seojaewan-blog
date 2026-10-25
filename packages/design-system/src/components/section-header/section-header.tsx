import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SectionHeaderProps = Omit<ComponentProps<'div'>, 'children' | 'onClick'> & {
  /** 피그마 Label 속성. 머리글 글자다 */
  label?: string;
  /** 머리글을 눌렀을 때. 넘기면 머리글을 Base UI Button으로 그린다(예: Start 메뉴의 글자 머리글을 눌러 글자 격자를 연다). 없으면 누를 수 없는 글자다 */
  onClick?: () => void;
};

/**
 * 목록 안 항목 묶음의 머리글(피그마 SectionHeader)을 그린다. Start 메뉴 목록과 검색 결과에 쓴다.
 * 너비는 글자에 맞춘다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function SectionHeader(props: SectionHeaderProps): JSX.Element {
  const { label = '머리글', onClick: handleClick, className, ...divProps } = props;
  const text = (
    <p className="shrink-0 type-body-strong whitespace-nowrap text-text-fill-primary">{label}</p>
  );
  if (handleClick === undefined) {
    return (
      <div
        {...divProps}
        className={cn('flex items-start overflow-clip px-12 pt-8 pb-4', className)}
      >
        {text}
      </div>
    );
  }
  // div 속성은 바깥 div가 받고, 누르는 버튼은 그 안을 채워 머리글 전체가 눌리게 한다. 모양은 버튼이 아닐 때와 같다.
  return (
    <div {...divProps} className={cn('flex items-start overflow-clip', className)}>
      <BaseButton
        type="button"
        onClick={handleClick}
        className="flex items-start px-12 pt-8 pb-4 text-left"
      >
        {text}
      </BaseButton>
    </div>
  );
}
