import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImageSizeResult } from '@/content/image-size/image-size';
import type { PostBlock } from '@/shared/utils/post-body/post-body';

import {
  createServedImageResolver,
  IMAGE_SIZE_ALERT_TITLE,
  type ImageAlert,
  resolvePostImages,
} from './post-images';

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

/**
 * 주소마다 정한 크기 결과를 돌려주는 이미지 바꾸기를 만든다.
 * @param results 주소마다의 크기 결과
 * @returns 이미지 바꾸기
 */
function resolverOf(
  results: Readonly<Record<string, ImageSizeResult>>,
): ReturnType<typeof createServedImageResolver> {
  return createServedImageResolver((url) =>
    Promise.resolve(results[url] ?? { kind: 'failed', reason: '정하지 않은 주소' }),
  );
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  it('본문 이미지(하위 블록 안 포함)와 커버에 이미지 서버가 준 폭·높이를 채운다', async () => {
    const sendAlert = vi.fn(() => Promise.resolve());
    const body = await resolvePostImages(
      { blocks, cover: COVER },
      {
        resolveImage: resolverOf({
          [IMAGE]: { kind: 'sized', width: 1440, height: 810 },
          [NESTED]: { kind: 'sized', width: 720, height: 720 },
          [COVER]: { kind: 'sized', width: 1440, height: 480 },
        }),
        sendAlert,
      },
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
    expect(sendAlert).not.toHaveBeenCalled();
  });

  it('크기를 받지 못한 이미지는 폭·높이 null로 그리고 경고 로그를 남긴다', async () => {
    const body = await resolvePostImages(
      { blocks, cover: COVER },
      {
        resolveImage: resolverOf({
          [IMAGE]: { kind: 'failed', reason: '10000ms 안에 답하지 않았다' },
          [NESTED]: { kind: 'sized', width: 720, height: 720 },
          [COVER]: { kind: 'failed', reason: '상태 502' },
        }),
      },
    );
    expect(body.blocks[0]).toEqual({
      type: 'image',
      url: IMAGE,
      width: null,
      height: null,
      caption: [],
    });
    expect(body.cover).toEqual({ url: COVER, width: null, height: null });
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('크기를 받지 못한 이미지를 모아 notify로 한 번 알린다', async () => {
    const alerts: ImageAlert[] = [];
    await resolvePostImages(
      { blocks, cover: COVER },
      {
        resolveImage: resolverOf({}),
        sendAlert: (alert) => {
          alerts.push(alert);
          return Promise.resolve();
        },
      },
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ title: IMAGE_SIZE_ALERT_TITLE, level: 'warn' });
    expect(alerts[0]?.message.split('\n')).toHaveLength(3);
  });

  it('알림 보내기가 실패해도 본문 만들기는 실패하지 않는다', async () => {
    const body = await resolvePostImages(
      { blocks, cover: null },
      {
        resolveImage: resolverOf({}),
        sendAlert: () => Promise.reject(new Error('notify에 닿지 않는다')),
      },
    );
    expect(body.cover).toBeNull();
    expect(body.blocks).toHaveLength(2);
  });
});
