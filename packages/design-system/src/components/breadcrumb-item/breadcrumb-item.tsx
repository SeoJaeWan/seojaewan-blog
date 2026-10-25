import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BreadcrumbItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Label 속성. 위치 이름 글자다 */
  label?: string;
  /** 피그마 Current. 지금 위치(마지막 칸)인지 알린다. 모양은 같고 접근성 속성(`aria-current`)만 바뀐다 */
  current?: boolean;
  /** 피그마 Show separator. 오른쪽 꺾쇠 구분자를 보일지 정한다 */
  showSeparator?: boolean;
};

/**
 * 경로의 한 칸(피그마 BreadcrumbItem)을 그린다. Breadcrumb의 Items 슬롯에 쓴다.
 * Rest·Hover·Pressed 모양은 CSS hover와 active로 바꾼다. Current는 모양이 같다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function BreadcrumbItem(props: BreadcrumbItemProps): JSX.Element {
  const {
    label = '위치 이름',
    current: isCurrent = false,
    showSeparator: hasSeparator = true,
    className,
    ...divProps
  } = props;
  return (
    <div {...divProps} className={cn('flex items-center', className)}>
      <button
        type="button"
        aria-current={isCurrent ? 'page' : undefined}
        className={cn(
          'flex max-w-200 items-start overflow-clip rounded-control px-6 py-4 select-none',
          'bg-subtle-fill-transparent hover:bg-subtle-fill-secondary active:bg-subtle-fill-tertiary',
          'motion-control-state',
        )}
      >
        <span className="min-w-px flex-1 truncate type-caption text-text-fill-primary">
          {label}
        </span>
      </button>
      {hasSeparator ? (
        <Asset
          name="icons/ic_fluent_chevron_right_16_regular.svg"
          className="size-icon-16 shrink-0 text-text-fill-secondary"
        />
      ) : null}
    </div>
  );
}
