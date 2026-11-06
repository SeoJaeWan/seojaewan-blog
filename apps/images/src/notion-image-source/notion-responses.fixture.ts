// Notion API 응답(2025-09-03) 모양의 가짜 응답. 시험에 필요한 필드만 둔다.

export const BLOCK_ID = '410c97ba-fd89-8100-0000-000000000001';
export const PAGE_ID = '410c97ba-fd89-8100-0000-000000000002';
export const BLOCK_EDITED_AT = '2026-11-06T02:33:00.000Z';
export const BLOCK_VERSION = '20261106T023300Z';

export const IMAGE_FILE_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/block/image.png?X-Amz-Signature=abc';
export const COVER_FILE_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/cover.png?X-Amz-Signature=def';
export const EXTERNAL_URL = 'https://www.notion.so/images/page-cover/rijksmuseum_jansz_1636.jpg';

/**
 * 이미지 블록 응답을 만든다.
 * @param options 바꿀 값
 * @param options.url 이미지 주소
 * @param options.type 이미지 종류
 * @param options.editedAt 블록을 고친 때
 * @returns 블록 응답
 */
export function imageBlock({
  url = IMAGE_FILE_URL,
  type = 'file',
  editedAt = BLOCK_EDITED_AT,
}: { url?: string; type?: 'file' | 'external'; editedAt?: string } = {}): unknown {
  return {
    object: 'block',
    id: BLOCK_ID,
    type: 'image',
    last_edited_time: editedAt,
    in_trash: false,
    has_children: false,
    image: {
      caption: [],
      type,
      ...(type === 'file'
        ? { file: { url, expiry_time: '2026-11-06T03:33:00.000Z' } }
        : { external: { url } }),
    },
  };
}

/**
 * 페이지 응답을 만든다.
 * @param cover 커버. 없으면 null
 * @returns 페이지 응답
 */
export function page(cover: { type: 'file' | 'external'; url: string } | null): unknown {
  return {
    object: 'page',
    id: PAGE_ID,
    in_trash: false,
    cover:
      cover === null
        ? null
        : cover.type === 'file'
          ? { type: 'file', file: { url: cover.url, expiry_time: '2026-11-06T03:33:00.000Z' } }
          : { type: 'external', external: { url: cover.url } },
    properties: {},
  };
}

/**
 * Notion 오류 응답을 만든다.
 * @param status 상태 코드
 * @param code 오류 코드
 * @returns 오류 응답
 */
export function notionError(status: number, code: string): unknown {
  return { object: 'error', status, code, message: `${code} message` };
}
