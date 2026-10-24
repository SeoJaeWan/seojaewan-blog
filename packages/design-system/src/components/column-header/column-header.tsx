import { Button as BaseButton } from '@base-ui/react/button';
import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type ColumnHeaderProps = Omit<ComponentProps<typeof BaseButton>, 'className' | 'children'> & {
  /** 피그마 Label 속성. 열 제목 글자다 */
  label?: string;
  /** 피그마 Sort 변형. 현재 정렬 방향이다 */
  sort?: 'none' | 'ascending' | 'descending';
  /** 바깥 배치(너비 등)에만 쓰는 클래스 */
  className?: string;
};

/**
 * 눌러서 정렬하는 열 제목 하나(피그마 ColumnHeader)를 그린다. DetailsHeader에 쓴다.
 * 너비는 부모가 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]). Hover는 실제 CSS hover로 그린다.
 * 오른쪽 구분선은 피그마에서 레이아웃에 들어가므로 실제 border로 그린다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function ColumnHeader(props: ColumnHeaderProps): JSX.Element {
  const { label = '열 이름', sort = 'none', className, ...buttonProps } = props;
  return (
    <BaseButton
      {...buttonProps}
      className={cn(
        'flex h-control-height items-center gap-4 border-r-default border-divider-stroke-default px-8 select-none',
        'bg-subtle-fill-transparent hover:bg-subtle-fill-secondary',
        'transition-colors duration-faster ease-fade',
        className,
      )}
    >
      <span className="min-w-px flex-1 overflow-hidden text-start type-caption text-ellipsis whitespace-nowrap text-text-fill-secondary">
        {label}
      </span>
      {sort !== 'none' && (
        <Asset
          name="icons/ic_fluent_chevron_down_16_regular.svg"
          className={cn(
            'size-icon-12 shrink-0 text-text-fill-secondary',
            sort === 'ascending' && 'rotate-180',
          )}
        />
      )}
    </BaseButton>
  );
}
