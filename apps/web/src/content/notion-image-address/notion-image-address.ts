import { createHash } from 'node:crypto';

/** 이미지 서버 주소. 환경마다 달라질 값이 아니라 코드 상수다([[배포 환경:환경 변수]]) */
export const IMAGE_SERVER_ORIGIN = 'https://images.seojaewan.com';

/** 커버 버전(커버 주소를 줄인 값)의 글자 수 */
const COVER_VERSION_LENGTH = 12;

/**
 * 본문 이미지 블록의 이미지 서버 주소를 만든다. Notion이 준 이미지 주소(만료되는 주소, 외부 주소)는 쓰지 않는다.
 * 버전은 블록을 고친 때(`last_edited_time`)에서 숫자와 `T`·`Z`만 남긴 값이라, 그림을 바꾸면 주소도 바뀐다.
 * @codocs [[Notion 이미지 제공:주소]]
 * @param blockId 이미지 블록 ID
 * @param lastEditedTime 블록의 `last_edited_time`(ISO 시각)
 * @returns `https://images.seojaewan.com/notion/<블록 ID>/<버전>`
 */
export function getNotionImageAddress(blockId: string, lastEditedTime: string): string {
  const version = lastEditedTime.replace(/\.\d+(?=Z$)/u, '').replaceAll(/[^0-9TZ]/gu, '');
  return `${IMAGE_SERVER_ORIGIN}/notion/${blockId}/${version}`;
}

/**
 * 페이지 커버의 이미지 서버 주소를 만든다. 버전은 커버 주소를 줄인 값(SHA-256 앞 12글자)이다.
 * Notion에 올린 커버는 주소의 서명(쿼리)이 요청마다 바뀌므로 쿼리를 빼고 줄인다. 외부 주소는 그대로 줄인다.
 * @codocs [[Notion 이미지 제공:주소]]
 * @param pageId 페이지 ID
 * @param cover 커버의 종류(`file`은 Notion에 올린 것, `external`은 외부 주소)와 주소
 * @param cover.type 커버 종류
 * @param cover.url 커버 주소
 * @returns `https://images.seojaewan.com/notion/cover/<페이지 ID>/<버전>`
 */
export function getNotionCoverAddress(
  pageId: string,
  { type, url }: { type: 'file' | 'external'; url: string },
): string {
  const stableUrl = type === 'file' ? url.split('?')[0] : url;
  const version = createHash('sha256')
    .update(stableUrl ?? url)
    .digest('hex')
    .slice(0, COVER_VERSION_LENGTH);
  return `${IMAGE_SERVER_ORIGIN}/notion/cover/${pageId}/${version}`;
}
