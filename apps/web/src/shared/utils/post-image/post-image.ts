// 글 이미지(본문 이미지와 커버)를 그릴 때의 크기별 사본 주소와 `sizes` 값, 받는 동안 잡는 자리의 크기다. 서버(`content/`)의 계약 시험도 같은 함수를 부른다.

/** 크기를 아는 글 이미지의 원본 크기(px) */
export type PostImageSize = {
  width: number;
  height: number;
};

/**
 * 글 이미지(`PostImage`)의 크기 부분. 모르면 null이다. 이 파일은 서버 계약 시험(`contracts/`)도 불러 앱 별칭(`@/`)을 쓰지 않으므로
 * `PostImage`를 가져오지 않고 크기만 받는다
 */
export type PostImageSizeSource = {
  width: number | null;
  height: number | null;
};

/** 이미지 서버가 만드는 폭. 글 본문 폭 토큰 `--size-post-width`(720)의 1배와 2배다 */
export const POST_IMAGE_WIDTHS = [720, 1440] as const;

/** 글 이미지의 `sizes`. 모바일 구간(767 이하)은 화면 폭, 그 위는 글 본문 폭이다 */
export const POST_IMAGE_SIZES = '(max-width: 767px) 100vw, 720px';

/**
 * 글 이미지의 `srcset`을 만든다. 폭마다 `?w=<폭>`을 붙인 주소에 폭 설명자(`720w`)를 단다.
 * 주소에 이미 쿼리가 있으면 `&`로 잇는다.
 * @codocs [[Notion 이미지 제공:최적화]]
 * @param url 이미지 주소(폭 없음)
 * @returns `srcset` 값
 */
export function getPostImageSrcSet(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return POST_IMAGE_WIDTHS.map(
    (width) => `${url}${separator}w=${String(width)} ${String(width)}w`,
  ).join(', ');
}

/**
 * 글 이미지의 원본 크기를 꺼낸다. 폭이나 높이를 모르면(null) 없다. 받는 동안 이 비율로 자리를 잡고, 없으면 16:9로 잡는다.
 * @codocs [[Notion 이미지 제공:로딩 표시]]
 * @param image 글 이미지(`PostImage`)의 크기
 * @returns 원본 크기. 모르면 undefined
 */
export function getPostImageSize(image: PostImageSizeSource): PostImageSize | undefined {
  if (image.width === null || image.height === null) {
    return undefined;
  }
  return { width: image.width, height: image.height };
}

/**
 * 맞춰 그리는 이미지(원본보다 키우지 않고 담는 칸에 비율대로 맞춤)가 차지할 높이의 CSS 값이다.
 * 담는 칸의 높이(`100%`), 원본 높이, 담는 칸 폭(`100cqw`, 담는 칸이 `@container`여야 한다)에 비율을 곱한 높이 중 가장 작은 값이다.
 * `max-width`·`max-height: 100%`와 원본 크기로 그리는 img의 높이와 같다.
 * @codocs [[Notion 이미지 제공:로딩 표시]]
 * @param size 원본 크기
 * @returns CSS `height` 값
 */
export function getContainedImageHeight(size: PostImageSize): string {
  return `min(100%, ${String(size.height)}px, calc(100cqw * ${String(size.height)} / ${String(size.width)}))`;
}
