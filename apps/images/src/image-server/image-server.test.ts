import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Alert, AlertSender } from '../alert-sender/alert-sender.ts';
import {
  createFakeFetch,
  type FakeRequest,
  jsonResponse,
} from '../fake-fetch/fake-fetch.fixture.ts';
import { getCoverVersion } from '../image-address/image-address.ts';
import { makeGif, makePng, makeSvg } from '../image-convert/test-images.fixture.ts';
import { createImageDownload } from '../image-download/image-download.ts';
import { createImageService } from '../image-service/image-service.ts';
import { createImageStore } from '../image-store/image-store.ts';
import { createNotionImageSource } from '../notion-image-source/notion-image-source.ts';
import {
  BLOCK_EDITED_AT,
  BLOCK_ID,
  BLOCK_VERSION,
  COVER_FILE_URL,
  IMAGE_FILE_URL,
  imageBlock,
  notionError,
  page,
  PAGE_ID,
} from '../notion-image-source/notion-responses.fixture.ts';
import { createImageServer, ERROR_CACHE_CONTROL, IMAGE_CACHE_CONTROL } from './image-server.ts';

const coverVersion = getCoverVersion({ type: 'file', url: COVER_FILE_URL });
const BLOCK_PATH = `/notion/${BLOCK_ID}/${BLOCK_VERSION}`;
const COVER_PATH = `/notion/cover/${PAGE_ID}/${coverVersion}`;

/** 가짜 Notion과 이미지 호스트가 돌려줄 것 */
type Upstream = {
  block: () => Response;
  cover: () => Response;
  image: () => Promise<Response> | Response;
};

let rootDir: string;
let upstream: Upstream;
let requests: FakeRequest[];
let alerts: Alert[];
let shouldAlertFail: boolean;
const servers: Server[] = [];

/**
 * 가짜 Notion·이미지 호스트를 보는 이미지 서버를 띄운다. 같은 저장 폴더로 여러 번 띄울 수 있다.
 * @returns 서버 주소
 */
async function startServer(): Promise<string> {
  const fake = createFakeFetch((request) => {
    if (request.url === `https://api.notion.com/v1/blocks/${BLOCK_ID}`) {
      return upstream.block();
    }
    if (request.url === `https://api.notion.com/v1/pages/${PAGE_ID}`) {
      return upstream.cover();
    }
    if (request.url === IMAGE_FILE_URL || request.url === COVER_FILE_URL) {
      return upstream.image();
    }
    return undefined;
  });
  requests = fake.requests;
  const alert: AlertSender = {
    send(sent) {
      if (shouldAlertFail) {
        return Promise.reject(new Error('notify에 닿지 않는다'));
      }
      alerts.push(sent);
      return Promise.resolve();
    },
  };
  const server = createImageServer(
    createImageService({
      store: createImageStore(rootDir),
      notion: createNotionImageSource({ token: 'token', fetch: fake.fetch }),
      download: createImageDownload(fake.fetch),
      alert,
    }),
  );
  servers.push(server);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}`;
}

/**
 * 이미지 응답을 돌려주는 함수를 만든다.
 * @param data 이미지
 * @returns 응답을 만드는 함수
 */
function imageResponse(data: Buffer): () => Response {
  return () => new Response(new Uint8Array(data));
}

/**
 * 받은 요청 가운데 Notion API와 이미지 내려받기 수를 센다.
 * @returns Notion 호출 수와 내려받기 수
 */
function upstreamCounts(): { notion: number; download: number } {
  const notion = requests.filter((request) =>
    request.url.startsWith('https://api.notion.com/'),
  ).length;
  return { notion, download: requests.length - notion };
}

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), 'images-server-'));
  alerts = [];
  shouldAlertFail = false;
  const png = await makePng(2000, 1000);
  upstream = {
    block: () => jsonResponse(imageBlock()),
    cover: () => jsonResponse(page({ type: 'file', url: COVER_FILE_URL })),
    image: imageResponse(png),
  };
});

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve);
          server.closeAllConnections();
        }),
    ),
  );
  await rm(rootDir, { recursive: true, force: true });
});

// @codocs [[Notion 이미지 제공:가져오는 시점]]
describe('Notion 이미지 제공:가져오는 시점', () => {
  it('저장본이 없으면 Notion에서 블록의 새 주소를 받아 내려받고 저장한 뒤 응답한다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`);
    expect(response.status).toBe(200);
    expect(upstreamCounts()).toEqual({ notion: 1, download: 1 });
  });

  it('커버는 페이지의 커버 주소로 같은 길을 지난다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${COVER_PATH}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(requests.map((request) => request.url)).toEqual([
      `https://api.notion.com/v1/pages/${PAGE_ID}`,
      COVER_FILE_URL,
    ]);
  });

  it('저장한 이미지는 Notion을 다시 부르지 않고 준다. 서버를 다시 띄워도 같다', async () => {
    const first = await startServer();
    await fetch(`${first}${BLOCK_PATH}`);
    await fetch(`${first}${BLOCK_PATH}?w=720`);
    expect(upstreamCounts()).toEqual({ notion: 1, download: 1 });

    const second = await startServer();
    const response = await fetch(`${second}${BLOCK_PATH}?w=720`);
    expect(response.status).toBe(200);
    expect(upstreamCounts()).toEqual({ notion: 0, download: 0 });
  });

  it('같은 이미지를 동시에 여러 번 요청해도 Notion 호출과 내려받기는 한 번이다', async () => {
    const png = await makePng(2000, 1000);
    upstream.image = () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(new Response(new Uint8Array(png)));
        }, 50);
      });
    const base = await startServer();
    const responses = await Promise.all(
      ['', '?w=720', '?w=1440', '', '?w=720'].map((query) => fetch(`${base}${BLOCK_PATH}${query}`)),
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);
    expect(upstreamCounts()).toEqual({ notion: 1, download: 1 });
  });

  it('요청한 버전이 지금 Notion의 버전과 다르면 없는 이미지(404)로 답하고 저장하지 않는다', async () => {
    upstream.block = () => jsonResponse(imageBlock({ editedAt: '2026-11-07T00:00:00.000Z' }));
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`);
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe(ERROR_CACHE_CONTROL);
    expect(upstreamCounts()).toEqual({ notion: 1, download: 0 });
    expect(alerts).toEqual([]);
  });

  it('없는 블록은 404를 짧은 캐시로 답하고 알리지 않는다', async () => {
    upstream.block = () => jsonResponse(notionError(404, 'object_not_found'), 404);
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`);
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe(ERROR_CACHE_CONTROL);
    expect(alerts).toEqual([]);
  });
});

// @codocs [[Notion 이미지 제공:최적화]]
describe('Notion 이미지 제공:최적화', () => {
  it('폭이 없으면 가장 큰 WebP(1440)를 준다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`);
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect([metadata.format, metadata.width, metadata.height]).toEqual(['webp', 1440, 720]);
  });

  it('?w=720은 폭 720의 WebP를 준다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}?w=720`);
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect([metadata.width, metadata.height]).toEqual([720, 360]);
  });

  it('원본이 작으면 원본보다 큰 폭을 만들지 않는다', async () => {
    upstream.image = imageResponse(await makePng(500, 250));
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}?w=1440`);
    expect(response.headers.get('X-Image-Width')).toBe('500');
    expect(response.headers.get('X-Image-Height')).toBe('250');
  });

  it('GIF는 원본 그대로 준다', async () => {
    const gif = await makeGif(800, 600);
    upstream.image = imageResponse(gif);
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}?w=720`);
    expect(response.headers.get('Content-Type')).toBe('image/gif');
    expect(Buffer.from(await response.arrayBuffer()).equals(gif)).toBe(true);
  });

  it('SVG는 원본 그대로 주고, 바로 열어도 스크립트가 돌지 않게 한다', async () => {
    const svg = makeSvg(1600, 900);
    upstream.image = imageResponse(svg);
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`);
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(Buffer.from(await response.arrayBuffer()).equals(svg)).toBe(true);
  });

  it('정하지 않은 폭은 400을 짧은 캐시로 답한다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}?w=800`);
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe(ERROR_CACHE_CONTROL);
    expect(requests).toEqual([]);
  });
});

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  it('이미지 응답은 Content-Type, immutable 캐시, 크기 머리를 준다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}?w=720`);
    expect(
      Object.fromEntries(
        ['Content-Type', 'Cache-Control', 'X-Image-Width', 'X-Image-Height'].map((name) => [
          name,
          response.headers.get(name),
        ]),
      ),
    ).toEqual({
      'Content-Type': 'image/webp',
      'Cache-Control': IMAGE_CACHE_CONTROL,
      'X-Image-Width': '720',
      'X-Image-Height': '360',
    });
  });

  it('HEAD 요청은 본문 없이 GET과 같은 머리를 주고, 저장본이 없으면 이때 가져와 저장한다', async () => {
    const base = await startServer();
    const head = await fetch(`${base}${BLOCK_PATH}`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(upstreamCounts()).toEqual({ notion: 1, download: 1 });

    const get = await fetch(`${base}${BLOCK_PATH}`);
    for (const name of [
      'Content-Type',
      'Content-Length',
      'Cache-Control',
      'X-Image-Width',
      'X-Image-Height',
    ]) {
      expect(head.headers.get(name)).toBe(get.headers.get(name));
    }
    expect(head.headers.get('X-Image-Width')).toBe('1440');
    expect(upstreamCounts()).toEqual({ notion: 1, download: 1 });
  });
});

// @codocs [[Notion 이미지 제공:주소]]
describe('Notion 이미지 제공:주소', () => {
  it.each([
    '/',
    '/notion',
    `/notion/${BLOCK_ID}`,
    `/notion/${BLOCK_ID}/${BLOCK_VERSION}.webp`,
    `/notion/cover/${PAGE_ID}/${BLOCK_VERSION}`,
    `/wallpaper/${BLOCK_ID}/${BLOCK_VERSION}`,
  ])('잘못된 경로(%s)는 Notion을 부르지 않고 404를 짧은 캐시로 답한다', async (address) => {
    const base = await startServer();
    const response = await fetch(`${base}${address}`);
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe(ERROR_CACHE_CONTROL);
    expect(requests).toEqual([]);
  });

  it('GET·HEAD가 아닌 요청은 405로 답한다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`, { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('상태 확인(/healthz)은 200을 캐시 없이 답한다', async () => {
    const base = await startServer();
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

// @codocs [[알림 프로세스:결정]]
describe('알림 프로세스:결정', () => {
  it('Notion 호출이 실패하면 502를 캐시 없이 답하고 알린다', async () => {
    upstream.block = () => jsonResponse(notionError(500, 'internal_server_error'), 500);
    const base = await startServer();
    const response = await fetch(`${base}${BLOCK_PATH}`);
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(alerts).toEqual([
      expect.objectContaining({
        title: 'Notion 이미지를 가져오지 못했다',
        level: 'error',
        message: expect.stringContaining(`block/${BLOCK_ID}/${BLOCK_VERSION}`) as unknown,
      }),
    ]);
  });

  it('이미지 내려받기가 실패하면 502로 답하고 알린다. 알림에 서명 주소를 넣지 않는다', async () => {
    upstream.image = () => new Response('expired', { status: 403 });
    const base = await startServer();
    const response = await fetch(`${base}${COVER_PATH}`);
    expect(response.status).toBe(502);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.message).not.toContain('X-Amz-Signature');
  });

  it('알림 보내기가 실패해도 응답은 그대로다', async () => {
    upstream.block = () => jsonResponse(notionError(500, 'internal_server_error'), 500);
    const base = await startServer();
    shouldAlertFail = true;
    const response = await fetch(`${base}${BLOCK_PATH}`);
    expect(response.status).toBe(502);
  });

  it('실패한 이미지는 다음 요청 때 다시 가져온다', async () => {
    upstream.block = () => jsonResponse(notionError(500, 'internal_server_error'), 500);
    const base = await startServer();
    expect((await fetch(`${base}${BLOCK_PATH}`)).status).toBe(502);
    upstream.block = () => jsonResponse(imageBlock({ editedAt: BLOCK_EDITED_AT }));
    expect((await fetch(`${base}${BLOCK_PATH}`)).status).toBe(200);
  });
});
