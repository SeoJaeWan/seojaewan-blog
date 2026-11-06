import { describe, expect, it } from 'vitest';

import { createFakeFetch, jsonResponse } from '../fake-fetch/fake-fetch.fixture.ts';
import { getCoverVersion } from '../image-address/image-address.ts';
import { ImageNotFoundError, ImageUpstreamError } from '../image-errors/image-errors.ts';
import { createNotionImageSource, NOTION_API_VERSION } from './notion-image-source.ts';
import {
  BLOCK_ID,
  BLOCK_VERSION,
  COVER_FILE_URL,
  EXTERNAL_URL,
  IMAGE_FILE_URL,
  imageBlock,
  notionError,
  page,
  PAGE_ID,
} from './notion-responses.fixture.ts';

const TOKEN = 'ntn_images_test_token';

/**
 * 정한 응답 하나를 돌려주는 Notion 원천을 만든다.
 * @param response 응답
 * @returns 원천과 받은 요청
 */
function sourceWith(response: Response): ReturnType<typeof createFakeFetch> & {
  source: ReturnType<typeof createNotionImageSource>;
} {
  const fake = createFakeFetch(() => response.clone());
  return { ...fake, source: createNotionImageSource({ token: TOKEN, fetch: fake.fetch }) };
}

// @codocs [[Notion 이미지 제공:가져오는 시점]]
describe('Notion 이미지 제공:가져오는 시점', () => {
  it('본문 이미지는 블록을 읽어 지금의 버전과 새 주소를 받는다', async () => {
    const { source, requests } = sourceWith(jsonResponse(imageBlock()));
    await expect(
      source.getImage({ kind: 'block', id: BLOCK_ID, version: BLOCK_VERSION }),
    ).resolves.toEqual({
      version: BLOCK_VERSION,
      url: IMAGE_FILE_URL,
    });
    expect(requests[0]?.url).toBe(`https://api.notion.com/v1/blocks/${BLOCK_ID}`);
    expect(requests[0]?.headers.get('Notion-Version')).toBe(NOTION_API_VERSION);
    expect(requests[0]?.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('외부 주소의 본문 이미지도 같은 길로 받는다', async () => {
    const { source } = sourceWith(
      jsonResponse(imageBlock({ type: 'external', url: EXTERNAL_URL })),
    );
    await expect(
      source.getImage({ kind: 'block', id: BLOCK_ID, version: BLOCK_VERSION }),
    ).resolves.toMatchObject({
      url: EXTERNAL_URL,
    });
  });

  it('커버는 페이지를 읽고, Notion에 올린 커버의 버전은 서명을 뺀 주소로 만든다', async () => {
    const { source, requests } = sourceWith(
      jsonResponse(page({ type: 'file', url: COVER_FILE_URL })),
    );
    const version = getCoverVersion({ type: 'file', url: COVER_FILE_URL.split('?')[0] ?? '' });
    await expect(source.getImage({ kind: 'cover', id: PAGE_ID, version })).resolves.toEqual({
      version,
      url: COVER_FILE_URL,
    });
    expect(requests[0]?.url).toBe(`https://api.notion.com/v1/pages/${PAGE_ID}`);
  });

  it('외부 주소 커버의 버전은 주소 그대로 줄인다', async () => {
    const { source } = sourceWith(jsonResponse(page({ type: 'external', url: EXTERNAL_URL })));
    await expect(source.getImage({ kind: 'cover', id: PAGE_ID, version: 'x' })).resolves.toEqual({
      version: getCoverVersion({ type: 'external', url: EXTERNAL_URL }),
      url: EXTERNAL_URL,
    });
  });

  it.each([
    ['없는 블록', jsonResponse(notionError(404, 'object_not_found'), 404)],
    ['잘못된 ID', jsonResponse(notionError(400, 'validation_error'), 400)],
    [
      '이미지가 아닌 블록',
      jsonResponse({ ...(imageBlock() as object), type: 'paragraph', image: undefined }),
    ],
    ['휴지통에 간 블록', jsonResponse({ ...(imageBlock() as object), in_trash: true })],
  ])('%s는 없는 이미지다', async (_name, response) => {
    const { source } = sourceWith(response);
    await expect(
      source.getImage({ kind: 'block', id: BLOCK_ID, version: BLOCK_VERSION }),
    ).rejects.toBeInstanceOf(ImageNotFoundError);
  });

  it('커버가 없는 페이지는 없는 이미지다', async () => {
    const { source } = sourceWith(jsonResponse(page(null)));
    await expect(
      source.getImage({ kind: 'cover', id: PAGE_ID, version: 'x' }),
    ).rejects.toBeInstanceOf(ImageNotFoundError);
  });

  it.each([
    ['토큰이 틀림', jsonResponse(notionError(401, 'unauthorized'), 401)],
    ['Notion 서버 오류', jsonResponse(notionError(500, 'internal_server_error'), 500)],
    ['모양이 다른 응답', jsonResponse({ object: 'block' })],
  ])('%s은 가져오기 실패이고 오류에 토큰을 넣지 않는다', async (_name, response) => {
    const { source } = sourceWith(response);
    const error: unknown = await source
      .getImage({ kind: 'block', id: BLOCK_ID, version: BLOCK_VERSION })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ImageUpstreamError);
    expect(String(error)).not.toContain(TOKEN);
  });

  it('Notion에 닿지 않으면 가져오기 실패다', async () => {
    const source = createNotionImageSource({
      token: TOKEN,
      fetch: () => Promise.reject(new Error('ECONNREFUSED')),
    });
    await expect(
      source.getImage({ kind: 'block', id: BLOCK_ID, version: BLOCK_VERSION }),
    ).rejects.toBeInstanceOf(ImageUpstreamError);
  });
});
