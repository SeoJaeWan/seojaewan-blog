// 글 이미지(본문 이미지와 커버)를 그릴 때의 크기별 사본 주소와 `sizes` 값이다. 서버(`content/`)의 계약 시험도 같은 함수를 부른다.

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
