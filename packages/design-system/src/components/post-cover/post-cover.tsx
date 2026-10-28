import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type PostCoverProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 `image` 속성(인스턴스 교체). 글의 커버 이미지다. 틀을 가득 채우고 모서리를 둥글게 잘라 그린다 */
  image: ReactNode;
};

/**
 * 글 머리 위의 커버 이미지(피그마 PostCover)를 그린다. 글 페이지에 쓴다. 이미지는 `image`로 받고
 * 실제 Notion 이미지 제공은 나중 기능이 맡는다. 높이는 240이고 너비는 쓰는 곳이 `className`으로
 * 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Chrome:Notion 블록]]
 * @param props
 */
export function PostCover(props: PostCoverProps): JSX.Element {
  const { image, className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex h-240 flex-col items-start overflow-hidden rounded-overlay [&>*]:block [&>*]:size-full [&>*]:object-cover',
        className,
      )}
    >
      {image}
    </div>
  );
}
