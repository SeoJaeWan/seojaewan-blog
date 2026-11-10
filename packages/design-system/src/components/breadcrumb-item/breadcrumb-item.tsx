import type { ComponentProps, JSX, MouseEvent, ReactElement, ReactNode } from 'react';

import { cn } from '../../cn';
import { BreadcrumbChevron } from '../breadcrumb-chevron/breadcrumb-chevron';

type BreadcrumbItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  label?: string;
  isCurrent?: boolean;
  hasSeparator?: boolean;
  separatorLabel?: string;
  isSeparatorOpen?: boolean;
  onLabelClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  renderSeparator?: (separator: ReactElement) => ReactNode;
};

/**
 * 경로의 한 칸(피그마 BreadcrumbItem)을 그린다. Breadcrumb의 Items 슬롯에 쓴다.
 * Rest·Hover·Pressed 모양은 CSS hover와 active로 바꾼다. isCurrent는 모양이 같아 피그마 변형에 없다.
 * 오른쪽 구분자는 BreadcrumbChevron 인스턴스다. 하위 폴더 메뉴는 쓰는 곳이 `renderSeparator`로 꺾쇠를 메뉴 트리거로 감싸 붙인다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props 컴포넌트 속성
 * @param props.label 피그마 Label 속성. 위치 이름 글자다
 * @param props.isCurrent 지금 위치(마지막 칸)인지 알린다. 피그마에는 없는 코드 전용 속성이다. 모양은 같고 접근성 속성(`aria-current`)만 바뀐다
 * @param props.hasSeparator 피그마 Has separator. 오른쪽 꺾쇠 구분자(BreadcrumbChevron)를 보일지 정한다
 * @param props.separatorLabel 꺾쇠 구분자 버튼의 접근성 이름(BreadcrumbChevron의 `label`)
 * @param props.isSeparatorOpen 꺾쇠 구분자가 연 메뉴가 열려 있는지(BreadcrumbChevron의 `isOpen`). 열린 동안 아래 꺾쇠(⌄)다
 * @param props.onLabelClick 위치 이름 버튼을 눌렀을 때 부른다. 구분자를 누른 것은 부르지 않는다
 * @param props.renderSeparator 꺾쇠 구분자를 감싸 그린다. 꺾쇠와 그 꺾쇠가 여는 메뉴를 묶는 메뉴 트리거가 꺾쇠 요소를 받아 쓴다.
 *   주지 않으면 꺾쇠를 그대로 그린다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function BreadcrumbItem({
  label = '위치 이름',
  isCurrent = false,
  hasSeparator = true,
  separatorLabel = '하위 폴더',
  isSeparatorOpen = false,
  onLabelClick: handleLabelClick,
  renderSeparator,
  className,
  ...divProps
}: BreadcrumbItemProps): JSX.Element {
  const separator = <BreadcrumbChevron label={separatorLabel} isOpen={isSeparatorOpen} />;
  return (
    <div
      {...divProps}
      // 오른쪽 꺾쇠 구분자를 그리는 상태다.
      data-separator={hasSeparator}
      className={cn('flex items-center', className)}
    >
      <button
        type="button"
        aria-current={isCurrent ? 'page' : undefined}
        onClick={handleLabelClick}
        className={cn(
          'flex max-w-size-breadcrumb-item-max-width items-start overflow-clip rounded-radius-control px-spacing-sm-nudge py-spacing-xs select-none',
          'bg-color-white-0 hover:bg-color-black-4 active:bg-color-black-2',
          'motion-control-state',
        )}
      >
        <span className="min-w-size-none flex-flex-fill truncate type-body text-color-black-89">
          {label}
        </span>
      </button>
      {hasSeparator
        ? renderSeparator === undefined
          ? separator
          : renderSeparator(separator)
        : null}
    </div>
  );
}
