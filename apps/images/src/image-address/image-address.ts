import { createHash } from 'node:crypto';

/** 이미지 서버가 만드는 WebP 폭. 글 본문 폭 토큰 `--size-post-width`의 1배와 2배다 */
export const IMAGE_WIDTHS = [720, 1440] as const;

/** 이미지 서버가 만드는 WebP 폭 */
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/** 커버 버전(커버 주소를 줄인 값)의 글자 수 */
const COVER_VERSION_LENGTH = 12;

// Notion API가 돌려주는 ID 모양(하이픈이 든 소문자 UUID)
const NOTION_ID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// 본문 이미지: `/notion/<블록 ID>/<버전>`. 버전은 `last_edited_time`에서 숫자와 `T`·`Z`만 남긴 값이다.
const blockPathPattern = new RegExp(`^/notion/(${NOTION_ID_PATTERN})/(\\d{8}T\\d{6}Z)$`, 'u');

// 커버: `/notion/cover/<페이지 ID>/<버전>`. 버전은 커버 주소 SHA-256 앞 12글자다.
const coverPathPattern = new RegExp(
  `^/notion/cover/(${NOTION_ID_PATTERN})/([0-9a-f]{${String(COVER_VERSION_LENGTH)}})$`,
  'u',
);

/** 이미지 하나를 가리키는 값. 본문 이미지는 블록 ID, 커버는 페이지 ID다 */
export type ImageKey = {
  kind: 'block' | 'cover';
  id: string;
  version: string;
};

/** 이미지 요청을 읽은 결과. 폭이 없으면(null) 가장 큰 것을 준다 */
export type ImageRequest =
  | { kind: 'image'; key: ImageKey; width: ImageWidth | null }
  | { kind: 'not-found' }
  | { kind: 'bad-width' };

/**
 * 요청 주소를 이미지와 폭으로 읽는다. 정한 주소 모양과 폭(`?w=720`, `?w=1440`)만 받는다.
 * @codocs [[Notion 이미지 제공:주소]]
 * @codocs [[Notion 이미지 제공:최적화]]
 * @param pathname 요청 경로
 * @param searchParams 요청 쿼리
 * @returns 이미지와 폭, 또는 받지 않는 이유
 */
export function parseImageRequest(pathname: string, searchParams: URLSearchParams): ImageRequest {
  const key = parseImagePath(pathname);
  if (key === null) {
    return { kind: 'not-found' };
  }
  const widths = searchParams.getAll('w');
  if (widths.length === 0) {
    return { kind: 'image', key, width: null };
  }
  const width = IMAGE_WIDTHS.find(
    (candidate) => widths.length === 1 && widths[0] === String(candidate),
  );
  return width === undefined ? { kind: 'bad-width' } : { kind: 'image', key, width };
}

/**
 * 본문 이미지 블록의 버전을 만든다. 블록을 고친 때(`last_edited_time`)에서 숫자와 `T`·`Z`만 남긴다.
 * 블로그가 주소를 만들 때와 같은 값이어야 한다.
 * @codocs [[Notion 이미지 제공:주소]]
 * @param lastEditedTime 블록의 `last_edited_time`(ISO 시각)
 * @returns 버전(예: `20261106T023300Z`)
 */
export function getBlockVersion(lastEditedTime: string): string {
  return lastEditedTime.replace(/\.\d+(?=Z$)/u, '').replaceAll(/[^0-9TZ]/gu, '');
}

/**
 * 페이지 커버의 버전을 만든다. 커버 주소 SHA-256의 앞 12글자다.
 * Notion에 올린 커버(`file`)는 주소의 서명(쿼리)이 요청마다 바뀌므로 쿼리를 빼고 줄인다.
 * 블로그가 주소를 만들 때와 같은 값이어야 한다.
 * @codocs [[Notion 이미지 제공:주소]]
 * @param cover 커버의 종류와 주소
 * @param cover.type 커버 종류(`file`은 Notion에 올린 것, `external`은 외부 주소)
 * @param cover.url 커버 주소
 * @returns 버전
 */
export function getCoverVersion({ type, url }: { type: 'file' | 'external'; url: string }): string {
  const stableUrl = type === 'file' ? (url.split('?')[0] ?? url) : url;
  return createHash('sha256').update(stableUrl).digest('hex').slice(0, COVER_VERSION_LENGTH);
}

/**
 * 요청 경로를 이미지로 읽는다.
 * @param pathname 요청 경로
 * @returns 이미지. 정한 모양이 아니면 null
 */
function parseImagePath(pathname: string): ImageKey | null {
  const cover = coverPathPattern.exec(pathname);
  if (cover?.[1] !== undefined && cover[2] !== undefined) {
    return { kind: 'cover', id: cover[1], version: cover[2] };
  }
  const block = blockPathPattern.exec(pathname);
  if (block?.[1] !== undefined && block[2] !== undefined) {
    return { kind: 'block', id: block[1], version: block[2] };
  }
  return null;
}
