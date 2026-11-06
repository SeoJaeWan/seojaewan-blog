import { describe, expect, it } from 'vitest';

import {
  getBlockVersion,
  getCoverVersion,
  parseImageRequest,
} from '../apps/images/src/image-address/image-address.ts';
import {
  getNotionCoverAddress,
  getNotionImageAddress,
  IMAGE_SERVER_ORIGIN,
} from '../apps/web/src/content/notion-image-address/notion-image-address.ts';

// 블로그(apps/web)와 이미지 서버(apps/images)는 서로 import하지 않는다.
// 두 앱이 같은 주소·버전 모양을 쓰는지는 두 앱 밖의 이 시험이 함께 불러 확인한다.

const BLOCK_ID = '410c97ba-fd89-8100-0000-000000000001';
const PAGE_ID = '410c97ba-fd89-8100-0000-000000000002';

/**
 * 블로그가 만든 주소를 이미지 서버가 읽는다.
 * @param address 블로그가 만든 이미지 주소
 * @returns 이미지 서버가 읽은 요청
 */
function parseByImageServer(address: string): ReturnType<typeof parseImageRequest> {
  const url = new URL(address);
  return parseImageRequest(url.pathname, url.searchParams);
}

// @codocs [[Notion 이미지 제공:주소]]
describe('Notion 이미지 제공:주소', () => {
  it('블로그의 이미지 서버 주소는 images.seojaewan.com이다', () => {
    expect(IMAGE_SERVER_ORIGIN).toBe('https://images.seojaewan.com');
  });

  it.each(['2026-11-06T02:33:00.000Z', '2026-01-01T00:00:00.000Z', '2026-11-06T23:59:00Z'])(
    '블로그가 만든 본문 이미지 주소(%s)를 이미지 서버가 읽고, 같은 블록에서 같은 버전을 만든다',
    (lastEditedTime) => {
      const parsed = parseByImageServer(getNotionImageAddress(BLOCK_ID, lastEditedTime));
      expect(parsed).toEqual({
        kind: 'image',
        key: { kind: 'block', id: BLOCK_ID, version: getBlockVersion(lastEditedTime) },
        width: null,
      });
    },
  );

  it.each([
    [
      'Notion에 올린 커버',
      'file',
      'https://prod-files-secure.s3.amazonaws.com/s/p/cover.png?X-Amz-Date=1',
    ],
    [
      '외부 주소 커버',
      'external',
      'https://www.notion.so/images/page-cover/rijksmuseum_jansz_1636.jpg',
    ],
  ] as const)(
    '블로그가 만든 %s 주소를 이미지 서버가 읽고, 같은 커버에서 같은 버전을 만든다',
    (_name, type, url) => {
      const parsed = parseByImageServer(getNotionCoverAddress(PAGE_ID, { type, url }));
      expect(parsed).toEqual({
        kind: 'image',
        key: { kind: 'cover', id: PAGE_ID, version: getCoverVersion({ type, url }) },
        width: null,
      });
    },
  );

  it('Notion에 올린 커버의 서명이 바뀌어도 두 앱의 버전이 같다', () => {
    const file = 'https://prod-files-secure.s3.amazonaws.com/s/p/cover.png';
    const blogAddress = getNotionCoverAddress(PAGE_ID, {
      type: 'file',
      url: `${file}?X-Amz-Date=1`,
    });
    const serverVersion = getCoverVersion({ type: 'file', url: `${file}?X-Amz-Date=2` });
    expect(blogAddress.endsWith(`/${serverVersion}`)).toBe(true);
  });
});
