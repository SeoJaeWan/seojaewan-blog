import type { JSX } from 'react';

import { cn, Figure } from '@seojaewan/design-system';

import { ResponsiveImage } from '@/features/chrome/components/responsive-image/responsive-image';
import { useImageLoad } from '@/features/chrome/hooks/use-image-load/use-image-load';
import type { PostImage } from '@/shared/utils/post-body/post-body';
import { getContainedImageHeight, getPostImageSize } from '@/shared/utils/post-image/post-image';

/**
 * 받는 동안의 자리
 * - fill: 담는 칸을 채운다(커버 칸). 다 받은 이미지도 칸을 채워 그린다
 * - contain: 원본보다 키우지 않고 담는 칸에 비율대로 맞춘 자리다(크게 보기). 담는 칸은 `@container`여야 한다.
 *   크기를 모르면 담는 칸 너비의 16:9다
 */
export type LoadingImageFit = 'fill' | 'contain';

type LoadingImageProps = {
  image: PostImage;
  alt: string;
  fit: LoadingImageFit;
  sizes?: string;
  className?: string;
};

/**
 * 받는 동안 스켈레톤을 보이는 글 이미지(커버, 크게 보기). 받는 동안은 다 받은 이미지가 차지할 자리(`fit`)를 잡고, 그 자리를
 * 디자인 시스템 Figure의 받는 중 칸(캡션 없음)이 채운다. 같은 이미지를 숨긴 img로 그 자리에 겹쳐 받기를 기다리고, 다 받으면
 * 이미지를 서서히 나타나게(`motion-image-enter`) 그린다. 받지 못하면 회색 칸으로 남는다.
 * 그릴 때 이미 받아진 이미지는 스켈레톤 없이 바로 보인다(`useImageLoad`). 본문 이미지는 Figure가 캡션과 함께 그리므로 PostBlocks가 맡는다.
 * @codocs [[Notion 이미지 제공:로딩 표시]]
 * @param props 컴포넌트 속성
 * @param props.image 이미지 주소와 크기
 * @param props.alt 대체 글자
 * @param props.fit 받는 동안의 자리
 * @param props.sizes 그려질 폭(`sizes`)
 * @param props.className 다 받은 이미지(img)의 클래스
 */
export function LoadingImage({
  image,
  alt,
  fit,
  sizes,
  className,
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
  const size = fit === 'contain' ? getPostImageSize(image) : undefined;
  return (
    <div
      className={cn(
        'relative',
        fit === 'fill' && 'size-full',
        fit === 'contain' && (size === undefined ? 'w-full' : 'max-w-full'),
      )}
      // 크기를 아는 맞춤 자리는 다 받은 이미지와 같은 크기로 잡는다. 너비는 높이와 비율로 정해진다
      style={
        size === undefined
          ? undefined
          : {
              aspectRatio: `${String(size.width)} / ${String(size.height)}`,
              height: getContainedImageHeight(size),
            }
      }
    >
      <Figure
        state={load.state}
        image={null}
        hasCaption={false}
        className={size === undefined && fit === 'contain' ? 'w-full' : 'size-full'}
      />
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
