import type { JSX } from 'react';

import { cn, Figure } from '@seojaewan/design-system';

import { ResponsiveImage } from '@/features/chrome/components/responsive-image/responsive-image';
import { useImageLoad } from '@/features/chrome/hooks/use-image-load/use-image-load';
import type { PostImage } from '@/shared/utils/post-body/post-body';

type LoadingImageProps = {
  image: PostImage;
  alt: string;
  sizes?: string;
  className?: string;
  placeholderClassName?: string;
};

/**
 * 받는 동안 스켈레톤을 보이는 글 이미지(커버, 크게 보기). 받는 동안은 디자인 시스템 Figure의 받는 중 칸(캡션 없음)과 그 위에
 * 숨긴 img를 그려 받기를 기다리고, 다 받으면 이미지를 서서히 나타나게(`motion-image-enter`) 그린다. 받지 못하면 회색 칸으로 남는다.
 * 그릴 때 이미 받아진 이미지는 스켈레톤 없이 바로 보인다(`useImageLoad`). 본문 이미지는 Figure가 캡션과 함께 그리므로 PostBlocks가 맡는다.
 * @codocs [[Notion 이미지 제공:로딩 표시]]
 * @param props 컴포넌트 속성
 * @param props.image 이미지 주소와 크기
 * @param props.alt 대체 글자
 * @param props.sizes 그려질 폭(`sizes`)
 * @param props.className 다 받은 이미지(img)의 클래스
 * @param props.placeholderClassName 받는 중·실패 칸의 바깥 클래스(크기·배치)
 */
export function LoadingImage({
  image,
  alt,
  sizes,
  className,
  placeholderClassName,
}: LoadingImageProps): JSX.Element {
  const load = useImageLoad();
  if (load.state === 'loaded') {
    return (
      <ResponsiveImage
        image={image}
        alt={alt}
        sizes={sizes}
        className={cn(className, load.isEntering && 'motion-image-enter')}
      />
    );
  }
  return (
    <div className={cn('relative', placeholderClassName)}>
      <Figure state={load.state} image={null} hasCaption={false} className="w-full" />
      {load.state === 'loading' && (
        <ResponsiveImage
          {...load.probeProps}
          image={image}
          alt=""
          sizes={sizes}
          isHidden
          className="invisible absolute inset-spacing-none size-full"
        />
      )}
    </div>
  );
}
