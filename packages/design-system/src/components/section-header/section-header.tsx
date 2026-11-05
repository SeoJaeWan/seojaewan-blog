import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SectionHeaderProps = Omit<ComponentProps<'div'>, 'children' | 'onClick'> & {
  label?: string;
  onClick?: () => void;
};

/**
 * 목록 안 항목 묶음의 머리글(피그마 SectionHeader)을 그린다. Start 메뉴 목록과 검색 결과에 쓴다.
 * 너비는 글자에 맞춘다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 머리글은 제목 태그(`h3`)로 그리고, 누를 수 있으면 제목 태그가 버튼을 감싼다.
 * @codocs [[접근성:영역 이름]]
 * @param props 컴포넌트 속성
 * @param props.label 피그마 Label 속성. 머리글 글자다
 * @param props.onClick 머리글을 눌렀을 때. 넘기면 머리글을 Base UI Button으로 그린다(예: Start 메뉴의 글자 머리글을 눌러 글자 격자를 연다). 없으면 누를 수 없는 글자다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function SectionHeader({
  label = '머리글',
  onClick: handleClick,
  className,
  ...divProps
}: SectionHeaderProps): JSX.Element {
  const textClassName = 'shrink-shrink-none type-body-strong whitespace-nowrap text-color-black-89';
  if (handleClick === undefined) {
    return (
      <div
        {...divProps}
        className={cn(
          'flex items-start overflow-clip px-spacing-md pt-spacing-sm pb-spacing-xs',
          className,
        )}
      >
        <h3 className={textClassName}>{label}</h3>
      </div>
    );
  }
  // div 속성은 바깥 div가 받고, 누르는 버튼은 그 안을 채워 머리글 전체가 눌리게 한다. 모양은 버튼이 아닐 때와 같다.
  return (
    <div {...divProps} className={cn('flex items-start overflow-clip', className)}>
      <h3 className="flex items-start">
        <BaseButton
          type="button"
          onClick={handleClick}
          className="flex items-start px-spacing-md pt-spacing-sm pb-spacing-xs text-left"
        >
          <span className={textClassName}>{label}</span>
        </BaseButton>
      </h3>
    </div>
  );
}
