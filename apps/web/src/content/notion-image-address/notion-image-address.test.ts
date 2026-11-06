import { describe, expect, it } from 'vitest';

import { getNotionCoverAddress, getNotionImageAddress } from './notion-image-address';

const BLOCK_ID = '410c97ba-fd89-8100-0000-000000000001';
const PAGE_ID = '410c97ba-fd89-8100-0000-000000000002';

// @codocs [[Notion 이미지 제공:주소]]
describe('Notion 이미지 제공:주소', () => {
  it('본문 이미지는 블록 ID와 블록을 고친 때로 이미지 서버 주소를 만든다', () => {
    expect(getNotionImageAddress(BLOCK_ID, '2026-11-06T02:33:00.000Z')).toBe(
      `https://images.seojaewan.com/notion/${BLOCK_ID}/20261106T023300Z`,
    );
  });

  it('본문 이미지를 고치면 주소가 바뀐다', () => {
    expect(getNotionImageAddress(BLOCK_ID, '2026-11-06T02:33:00.000Z')).not.toBe(
      getNotionImageAddress(BLOCK_ID, '2026-11-06T02:34:00.000Z'),
    );
  });

  it('커버는 페이지 ID와 커버 주소를 줄인 값으로 이미지 서버 주소를 만든다', () => {
    expect(
      getNotionCoverAddress(PAGE_ID, { type: 'external', url: 'https://example.com/a.png' }),
    ).toMatch(
      new RegExp(`^https://images\\.seojaewan\\.com/notion/cover/${PAGE_ID}/[0-9a-f]{12}$`),
    );
  });

  it('Notion에 올린 커버는 서명(쿼리)이 바뀌어도 주소가 같고, 그림이 바뀌면 주소가 바뀐다', () => {
    const file = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/cover.png';
    const first = getNotionCoverAddress(PAGE_ID, { type: 'file', url: `${file}?X-Amz-Date=1` });
    expect(getNotionCoverAddress(PAGE_ID, { type: 'file', url: `${file}?X-Amz-Date=2` })).toBe(
      first,
    );
    expect(
      getNotionCoverAddress(PAGE_ID, { type: 'file', url: `${file.replace('cover', 'new')}?a` }),
    ).not.toBe(first);
  });
});
