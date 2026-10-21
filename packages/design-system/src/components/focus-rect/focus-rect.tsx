import type { JSX } from 'react';

import { mergeClassNames } from '../../merge-class-names';

type FocusRectProps = {
  /** 위치·표시 조건 등을 덧붙일 클래스. 예: `hidden group-focus-visible:block` */
  className?: string;
};

/**
 * 키보드 포커스 사각형(피그마 FocusRect)을 그린다. 바깥 검정 2px, 안쪽 흰색 1px이고 컨트롤 바깥으로 3px 나간다.
 * 부모에 relative 같은 위치 지정이 있어야 한다. 언제 보일지는 쓰는 쪽이 `className`으로 정한다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function FocusRect(props: FocusRectProps): JSX.Element {
  return (
    <span
      aria-hidden
      // @codocs [[피그마 일치 검사:스토리 규칙]] 피그마에서 컨트롤에 넣은 FocusRect 인스턴스 이름이다.
      data-figma="focus rect"
      className={mergeClassNames(
        'pointer-events-none absolute inset-focus-rect rounded-focus-outer border-focus-outer border-focus-stroke-outer',
        props.className,
      )}
    >
      <span className="absolute inset-0 rounded-focus-inner border-focus-inner border-focus-stroke-inner" />
    </span>
  );
}
