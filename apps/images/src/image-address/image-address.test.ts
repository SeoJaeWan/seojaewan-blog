import { describe, expect, it } from 'vitest';

import { getBlockVersion, getCoverVersion, parseImageRequest } from './image-address.ts';

const BLOCK_ID = '410c97ba-fd89-8100-0000-000000000001';
const PAGE_ID = '410c97ba-fd89-8100-0000-000000000002';

/**
 * 경로와 쿼리로 요청을 읽는다.
 * @param address 경로와 쿼리
 * @returns 읽은 요청
 */
function parse(address: string): ReturnType<typeof parseImageRequest> {
  const url = new URL(address, 'https://images.seojaewan.com');
  return parseImageRequest(url.pathname, url.searchParams);
}

// @codocs [[Notion 이미지 제공:주소]]
describe('Notion 이미지 제공:주소', () => {
  it('본문 이미지 주소는 블록 ID와 버전으로 읽는다', () => {
    expect(parse(`/notion/${BLOCK_ID}/20261106T023300Z`)).toEqual({
      kind: 'image',
      key: { kind: 'block', id: BLOCK_ID, version: '20261106T023300Z' },
      width: null,
    });
  });

  it('커버 주소는 페이지 ID와 12글자 버전으로 읽는다', () => {
    expect(parse(`/notion/cover/${PAGE_ID}/0123456789ab`)).toEqual({
      kind: 'image',
      key: { kind: 'cover', id: PAGE_ID, version: '0123456789ab' },
      width: null,
    });
  });

  it.each([
    ['정한 모양이 아닌 경로', '/'],
    ['버전이 없는 경로', `/notion/${BLOCK_ID}`],
    ['확장자가 붙은 경로', `/notion/${BLOCK_ID}/20261106T023300Z.webp`],
    ['하이픈 없는 ID', `/notion/${BLOCK_ID.replaceAll('-', '')}/20261106T023300Z`],
    ['대문자 ID', `/notion/${BLOCK_ID.toUpperCase()}/20261106T023300Z`],
    ['본문 이미지 버전 모양이 다른 경로', `/notion/${BLOCK_ID}/2026-11-06`],
    ['커버 버전 길이가 다른 경로', `/notion/cover/${PAGE_ID}/0123456789abc`],
    ['위 폴더로 가는 경로', `/notion/../${BLOCK_ID}/20261106T023300Z`],
  ])('%s는 없는 주소다', (_name, address) => {
    expect(parse(address)).toEqual({ kind: 'not-found' });
  });

  it('본문 이미지 버전은 last_edited_time에서 숫자와 T·Z만 남긴다', () => {
    expect(getBlockVersion('2026-11-06T02:33:00.000Z')).toBe('20261106T023300Z');
  });

  it('Notion에 올린 커버는 서명(쿼리)을 빼고 줄여, 서명이 바뀌어도 버전이 같다', () => {
    const file = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/cover.png';
    const version = getCoverVersion({ type: 'file', url: `${file}?X-Amz-Date=1` });
    expect(version).toMatch(/^[0-9a-f]{12}$/u);
    expect(getCoverVersion({ type: 'file', url: `${file}?X-Amz-Date=2` })).toBe(version);
  });

  it('외부 주소 커버는 쿼리까지 줄인다', () => {
    expect(getCoverVersion({ type: 'external', url: 'https://example.com/a.png?v=1' })).not.toBe(
      getCoverVersion({ type: 'external', url: 'https://example.com/a.png?v=2' }),
    );
  });
});

// @codocs [[Notion 이미지 제공:최적화]]
describe('Notion 이미지 제공:최적화', () => {
  const address = `/notion/${BLOCK_ID}/20261106T023300Z`;

  it.each([720, 1440])('폭 %i를 받는다', (width) => {
    expect(parse(`${address}?w=${String(width)}`)).toMatchObject({ kind: 'image', width });
  });

  it('폭이 없으면 가장 큰 것을 주도록 폭을 비운다', () => {
    expect(parse(address)).toMatchObject({ kind: 'image', width: null });
  });

  it.each(['?w=800', '?w=', '?w=original', '?w=720&w=1440'])(
    '정하지 않은 폭(%s)은 받지 않는다',
    (query) => {
      expect(parse(`${address}${query}`)).toEqual({ kind: 'bad-width' });
    },
  );
});
