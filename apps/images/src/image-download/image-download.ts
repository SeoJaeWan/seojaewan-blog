import { ImageUpstreamError } from '../image-errors/image-errors.ts';

/** 내려받는 이미지의 가장 큰 크기(바이트). 메모리에 올려 변환하므로 막는다 */
const MAX_IMAGE_BYTES = 52_428_800;

/** 이미지를 내려받을 때 기다리는 시간(밀리초) */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/** 주소의 이미지를 내려받는다 */
export type ImageDownload = (url: string) => Promise<Buffer>;

/**
 * 이미지를 내려받는 함수를 만든다. `http`·`https` 주소만 받고, 너무 큰 파일은 중간에 끊는다.
 * 실패하면 알림을 보낼 오류(`ImageUpstreamError`)를 던진다.
 * @codocs [[Notion 이미지 제공:가져오는 시점]]
 * @param fetch HTTP 요청 함수. 시험에서 가짜 응답을 넣는다
 * @returns 이미지를 내려받는 함수
 */
export function createImageDownload(
  fetch: typeof globalThis.fetch = globalThis.fetch,
): ImageDownload {
  return async (url) => {
    const host = safeHost(url);
    if (host === null) {
      throw new ImageUpstreamError('이미지 주소가 http·https가 아니다');
    }
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    } catch (error) {
      throw new ImageUpstreamError(`이미지(${host})를 받지 못했다: ${describe(error)}`);
    }
    if (!response.ok || response.body === null) {
      throw new ImageUpstreamError(`이미지(${host})를 받지 못했다(${String(response.status)})`);
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    try {
      for (let read = await reader.read(); !read.done; read = await reader.read()) {
        size += read.value.byteLength;
        if (size > MAX_IMAGE_BYTES) {
          await reader.cancel();
          throw new ImageUpstreamError(`이미지(${host})가 너무 크다`);
        }
        chunks.push(read.value);
      }
    } catch (error) {
      if (error instanceof ImageUpstreamError) {
        throw error;
      }
      throw new ImageUpstreamError(`이미지(${host})를 받다가 끊겼다: ${describe(error)}`);
    }
    return Buffer.concat(chunks);
  };
}

/**
 * 주소의 호스트를 꺼낸다. 알림과 로그에 서명(쿼리)이 든 전체 주소를 남기지 않기 위해서다.
 * @param url 이미지 주소
 * @returns 호스트. `http`·`https` 주소가 아니면 null
 */
function safeHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.host : null;
  } catch {
    return null;
  }
}

/**
 * 오류를 한 줄로 바꾼다.
 * @param error 오류
 * @returns 오류 메시지
 */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
