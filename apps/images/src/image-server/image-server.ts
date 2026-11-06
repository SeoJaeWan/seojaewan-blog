import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pipeline } from 'node:stream/promises';

import { parseImageRequest } from '../image-address/image-address.ts';
import { ImageNotFoundError } from '../image-errors/image-errors.ts';
import type { ImageService } from '../image-service/image-service.ts';
import type { StoredImage } from '../image-store/image-store.ts';

/** 이미지 응답의 캐시. 같은 주소의 그림은 바뀌지 않으므로 오래 두고 다시 확인하지 않는다 */
export const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** 잘못된 요청과 없는 이미지 응답의 캐시. 연동을 연결하거나 글을 고치면 곧 바뀔 수 있어 짧게 둔다 */
export const ERROR_CACHE_CONTROL = 'public, max-age=60';

/** 가져오기 실패와 상태 확인 응답의 캐시. 남기지 않는다 */
const NO_STORE = 'no-store';

/** 응답마다 붙이는 머리. SVG를 바로 열어도 스크립트가 돌지 않게 한다 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
} as const;

/**
 * 이미지 서버를 만든다. 듣기(`listen`)는 부르는 쪽이 한다.
 * - `GET`·`HEAD /notion/<블록 ID>/<버전>`, `/notion/cover/<페이지 ID>/<버전>`: 이미지. `?w=720`·`?w=1440`만 받고 없으면 가장 큰 것을 준다.
 *   `Content-Type`, `immutable` 캐시, 크기 머리(`X-Image-Width`·`X-Image-Height`)를 준다. HEAD도 같은 머리를 준다.
 * - `GET /healthz`: 상태 확인
 * - 잘못된 경로·폭, 없는 이미지는 4xx를 짧은 캐시로 준다. 가져오기 실패는 502를 캐시 없이 준다.
 * @codocs [[Notion 이미지 제공:결정]]
 * @codocs [[Notion 이미지 제공:크기]]
 * @codocs [[Notion 이미지 제공:최적화]]
 * @param service 이미지 서비스
 * @returns HTTP 서버
 */
export function createImageServer(service: ImageService): Server {
  return createServer((request, response) => {
    handleRequest(service, request, response).catch(handleFailure.bind(null, response));
  });
}

/**
 * 요청 하나에 응답한다.
 * @param service 이미지 서비스
 * @param request 요청
 * @param response 응답
 * @returns 응답을 마치면 끝나는 Promise
 */
async function handleRequest(
  service: ImageService,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, '허용하지 않는 메서드', ERROR_CACHE_CONTROL);
    return;
  }
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/healthz') {
    sendText(response, 200, 'ok', NO_STORE);
    return;
  }
  const parsed = parseImageRequest(url.pathname, url.searchParams);
  if (parsed.kind === 'not-found') {
    sendText(response, 404, '없는 주소', ERROR_CACHE_CONTROL);
    return;
  }
  if (parsed.kind === 'bad-width') {
    sendText(response, 400, '폭은 720이나 1440만 받는다', ERROR_CACHE_CONTROL);
    return;
  }

  let image: StoredImage;
  try {
    image = await service.getImage(parsed.key);
  } catch (error) {
    if (error instanceof ImageNotFoundError) {
      sendText(response, 404, '없는 이미지', ERROR_CACHE_CONTROL);
    } else {
      sendText(response, 502, '이미지를 가져오지 못했다', NO_STORE);
    }
    return;
  }

  const file = image[parsed.width ?? 1440];
  const { size } = await stat(file.path);
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': file.contentType,
    'Content-Length': String(size),
    'Cache-Control': IMAGE_CACHE_CONTROL,
    'X-Image-Width': String(file.width),
    'X-Image-Height': String(file.height),
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  await pipeline(createReadStream(file.path), response);
}

/**
 * 응답 중에 생긴 뜻밖의 오류를 처리한다. 머리를 보내기 전이면 500을 주고, 보낸 뒤면 연결을 끊는다.
 * @param response 응답
 * @param error 오류
 */
function handleFailure(response: ServerResponse, error: unknown): void {
  console.error(`[images] 응답하지 못했다: ${describe(error)}`);
  if (response.headersSent) {
    response.destroy();
    return;
  }
  sendText(response, 500, '서버 오류', NO_STORE);
}

/**
 * 글자 응답을 보낸다.
 * @param response 응답
 * @param status 상태 코드
 * @param text 본문
 * @param cacheControl 캐시 머리
 */
function sendText(
  response: ServerResponse,
  status: number,
  text: string,
  cacheControl: string,
): void {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': cacheControl,
  });
  response.end(text);
}

/**
 * 오류를 한 줄로 바꾼다.
 * @param error 오류
 * @returns 오류 메시지
 */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
