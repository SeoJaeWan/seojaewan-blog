import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type UnsupportedBlockProps = Omit<ComponentProps<'div'>, 'children'> & {
  typeName?: string;
};

/**
 * 글 본문에서 지원하지 않는 Notion 블록 자리에 보여 주는 안내 상자(피그마 UnsupportedBlock)를 그린다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 색과 모서리는 토큰 한 가지 모양이다(@codocs [[Notion 블록:지원하지 않는 블록]]).
 * @param props 컴포넌트 속성
 * @param props.typeName 지원하지 않는 Notion 블록의 유형 이름. 안내 글의 괄호 안에 들어간다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function UnsupportedBlock({
  typeName = '유형 이름',
  className,
  ...divProps
}: UnsupportedBlockProps): JSX.Element {
  return (
    <div
      {...divProps}
      // 피그마에서 테두리가 레이아웃에 들어가므로 CSS border를 쓴다.
      className={cn(
        'flex items-center gap-spacing-sm rounded-radius-overlay border-stroke-width-default border-color-black-6 bg-color-black-4 px-spacing-lg py-spacing-md',
        className,
      )}
    >
      <Asset
        name="icons/ic_fluent_warning_24_regular.svg"
        className="size-size-icon-sm shrink-shrink-none text-color-black-61"
      />
      <p className="min-w-size-none flex-flex-fill type-body break-words text-color-black-61">
        {`지원하지 않는 블록(${typeName})`}
      </p>
    </div>
  );
}
