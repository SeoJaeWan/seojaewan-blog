import type { JSX, Ref } from 'react';

import type { PostImage } from '@/shared/utils/post-body/post-body';
import { getPostImageSrcSet, POST_IMAGE_SIZES } from '@/shared/utils/post-image/post-image';

type ResponsiveImageProps = {
  image: PostImage;
  alt: string;
  sizes?: string;
  className?: string;
  ref?: Ref<HTMLImageElement>;
  onLoad?: () => void;
  onError?: () => void;
  isHidden?: boolean;
};

/**
 * 글 이미지(본문 이미지와 커버)를 이미지 서버의 크기별 사본으로 그린다. `srcset`은 720w·1440w이고, 크기를 알면
 * `width`·`height`를 달아 이미지가 오기 전에 자리를 잡는다(모르면 달지 않는다). 화면 밖 이미지는 늦게 받는다(`loading="lazy"`).
 * @codocs [[Notion 이미지 제공:크기]]
 * @codocs [[Notion 이미지 제공:최적화]]
 * @param props 컴포넌트 속성
 * @param props.image 이미지 주소와 크기
 * @param props.alt 대체 글자. 캡션이 없으면 빈 글자다
 * @param props.sizes 그려질 폭(`sizes`). 없으면 글 본문 폭 기준(`(max-width: 767px) 100vw, 720px`)이다
 * @param props.className 바깥 배치 클래스
 * @param props.ref img 요소
 * @param props.onLoad 다 받았을 때
 * @param props.onError 받지 못했을 때
 * @param props.isHidden 받기 상태만 보려고 숨겨 그리는 img인지. 보조 기술에서도 숨긴다
 */
export function ResponsiveImage({
  image,
  alt,
  sizes = POST_IMAGE_SIZES,
  className,
  ref,
  onLoad: handleLoad,
  onError: handleError,
  isHidden = false,
}: ResponsiveImageProps): JSX.Element {
  return (
    <img
      ref={ref}
      src={image.url}
      srcSet={getPostImageSrcSet(image.url)}
      sizes={sizes}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading="lazy"
      decoding="async"
      alt={isHidden ? '' : alt}
      aria-hidden={isHidden ? true : undefined}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
