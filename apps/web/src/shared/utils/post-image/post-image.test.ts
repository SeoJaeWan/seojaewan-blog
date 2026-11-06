import { describe, expect, it } from 'vitest';

import { getPostImageSrcSet, POST_IMAGE_SIZES } from './post-image';

const ADDRESS =
  'https://images.seojaewan.com/notion/410c97ba-fd89-8100-0000-000000000001/20261106T023300Z';

// @codocs [[Notion 이미지 제공:최적화]]
describe('Notion 이미지 제공:최적화', () => {
  it('srcset은 720w와 1440w 두 벌이고 주소에 ?w=로 폭을 붙인다', () => {
    expect(getPostImageSrcSet(ADDRESS)).toBe(`${ADDRESS}?w=720 720w, ${ADDRESS}?w=1440 1440w`);
  });

  it('주소에 쿼리가 있으면 &로 폭을 잇는다', () => {
    expect(getPostImageSrcSet('/a.png?v=1')).toBe('/a.png?v=1&w=720 720w, /a.png?v=1&w=1440 1440w');
  });

  it('sizes는 모바일 경계(767) 아래에서 화면 폭, 그 위에서 글 본문 폭(720)이다', () => {
    expect(POST_IMAGE_SIZES).toBe('(max-width: 767px) 100vw, 720px');
  });
});
