import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { SectionTitle } from '../section-title/section-title';

type TocProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  isExpanded?: boolean;
  title?: string;
  children?: ReactNode;
  titleProps?: Omit<ComponentProps<'div'>, 'children' | 'className'>;
};

/**
 * 글 페이지의 목차(피그마 Toc)를 그린다. 넓은 창에서는 펼치고 좁은 창에서는 접어 쓴다.
 * 항목은 `children` 슬롯으로 채우고, 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[Chrome:글 화면]]
 * @param props 컴포넌트 속성
 * @param props.isExpanded 피그마 State=Expanded 변형. 펼치면 제목과 항목 목록, 접으면 제목과 아래 꺾쇠만 보인다
 * @param props.title 제목 글자다
 * @param props.children 피그마 `Items` 슬롯. 펼친 상태에서 TocItem을 세로로 넣는다. 최대 높이(size/toc/items-max-height)를 넘으면 슬롯 안에서 세로로 스크롤한다
 * @param props.titleProps 펼친 상태의 제목(SectionTitle)에 넘길 동작·접근성 속성. 제목을 눌러 접는 버튼으로 쓸 때 준다. 생김새는 그대로다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Toc({
  isExpanded = true,
  title = '목차',
  children,
  titleProps,
  className,
  ...divProps
}: TocProps): JSX.Element {
  if (!isExpanded) {
    return (
      <div
        {...divProps}
        className={cn(
          'flex items-center overflow-clip rounded-radius-control border-stroke-width-default border-color-black-6 bg-color-gray-3-50 px-spacing-md py-spacing-sm',
          className,
        )}
      >
        <p className="min-w-size-none flex-flex-fill type-body-strong text-color-black-89">
          {title}
        </p>
        <Asset
          name="icons/ic_fluent_chevron_down_20_regular.svg"
          className="size-size-icon-md shrink-shrink-none text-color-black-89"
        />
      </div>
    );
  }
  return (
    <div
      {...divProps}
      className={cn('flex flex-col items-start gap-spacing-sm pt-spacing-xs', className)}
    >
      <SectionTitle {...titleProps} title={title} className="w-full shrink-shrink-none" />
      {/* 피그마 Items 슬롯의 배치(세로, 간격 spacing/8)다. 최대 높이를 넘으면 목차 안에서 세로로 스크롤한다 */}
      <div className="flex max-h-size-toc-items-max-height w-full shrink-shrink-none flex-col items-start gap-spacing-sm overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
