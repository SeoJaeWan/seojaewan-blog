import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { createExportedImageResolver, resolvePostImages } from './post-images';

vi.mock('server-only', () => ({}));

const IMAGE =
  'https://images.seojaewan.com/notion/410c97ba-fd89-8100-0000-000000000001/20261106T023300Z';
const NESTED =
  'https://images.seojaewan.com/notion/410c97ba-fd89-8100-0000-000000000003/20261106T023300Z';
const COVER =
  'https://images.seojaewan.com/notion/cover/410c97ba-fd89-8100-0000-000000000002/0123456789ab';

const blocks: PostBlock[] = [
  { type: 'image', url: IMAGE, width: null, height: null, caption: [] },
  {
    type: 'toggle',
    richText: [{ text: '토글', link: null }],
    children: [{ type: 'image', url: NESTED, width: null, height: null, caption: [] }],
  },
];

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  it('본문 이미지(하위 블록 안 포함)와 커버에 내보낸 JSON의 폭·높이를 채운다', async () => {
    const body = await resolvePostImages(
      { blocks, cover: COVER },
      createExportedImageResolver({
        [IMAGE]: { width: 1440, height: 810 },
        [NESTED]: { width: 720, height: 720 },
        [COVER]: { width: 1440, height: 480 },
      }),
    );
    expect(body).toEqual({
      blocks: [
        { type: 'image', url: IMAGE, width: 1440, height: 810, caption: [] },
        {
          type: 'toggle',
          richText: [{ text: '토글', link: null }],
          children: [{ type: 'image', url: NESTED, width: 720, height: 720, caption: [] }],
        },
      ],
      cover: { url: COVER, width: 1440, height: 480 },
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('내보낼 때 크기를 받지 못한 이미지(null)는 폭·높이 null로 그리고 경고를 다시 남기지 않는다', async () => {
    const body = await resolvePostImages(
      { blocks, cover: COVER },
      createExportedImageResolver({ [IMAGE]: null, [NESTED]: null, [COVER]: null }),
    );
    expect(body.blocks[0]).toEqual({
      type: 'image',
      url: IMAGE,
      width: null,
      height: null,
      caption: [],
    });
    expect(body.cover).toEqual({ url: COVER, width: null, height: null });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('내보낸 JSON에 없는 주소는 크기 없이 그리고 경고 로그를 남긴다', async () => {
    const body = await resolvePostImages(
      { blocks, cover: null },
      createExportedImageResolver({ [NESTED]: { width: 720, height: 720 } }),
    );
    expect(body.cover).toBeNull();
    expect(body.blocks[0]).toMatchObject({ width: null, height: null });
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
