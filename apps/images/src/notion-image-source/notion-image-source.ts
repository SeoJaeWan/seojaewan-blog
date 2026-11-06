import { z } from 'zod';

import { getBlockVersion, getCoverVersion, type ImageKey } from '../image-address/image-address.ts';
import { ImageNotFoundError, ImageUpstreamError } from '../image-errors/image-errors.ts';

/** 이미지 서버가 쓰는 Notion API 버전. 블로그와 같은 버전이다 */
export const NOTION_API_VERSION = '2025-09-03';

/** Notion API 주소 */
export const NOTION_API_ORIGIN = 'https://api.notion.com';

/** 요청이 너무 많다(429)는 응답을 받았을 때 다시 보내는 횟수 */
const NOTION_RETRY_LIMIT = 3;

/** 기다릴 시간을 알려 주지 않은 429 응답 뒤 기다리는 시간(초) */
const NOTION_DEFAULT_RETRY_SECONDS = 1;

/** Notion 응답을 기다리는 시간(밀리초) */
const NOTION_TIMEOUT_MS = 15_000;

/** 지금 Notion에 있는 이미지. 버전과 내려받을 주소(만료되는 주소일 수 있다)다 */
export type NotionImage = {
  version: string;
  url: string;
};

/** 블록·페이지 커버에서 지금의 이미지를 찾는다 */
export type NotionImageSource = {
  getImage: (key: ImageKey) => Promise<NotionImage>;
};

// 이미지 파일. Notion에 올린 것(`file`)은 만료되는 주소이고, 외부 주소(`external`)는 그대로다.
const fileSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file'), file: z.object({ url: z.string() }) }),
  z.object({ type: z.literal('external'), external: z.object({ url: z.string() }) }),
]);

const blockSchema = z.object({
  object: z.literal('block'),
  type: z.string(),
  last_edited_time: z.string(),
  in_trash: z.boolean().optional(),
  image: fileSchema.optional(),
});

const pageSchema = z.object({
  object: z.literal('page'),
  in_trash: z.boolean().optional(),
  cover: fileSchema.nullable(),
});

const errorSchema = z.object({ code: z.string(), message: z.string() });

// 없는 것으로 보는 Notion 오류. 잘못된 ID(`validation_error`)와 연동에 연결되지 않은 페이지도 없는 것과 같다.
const NOT_FOUND_CODES = ['object_not_found', 'validation_error'] as const;

/**
 * Notion API로 이미지를 찾는 원천을 만든다. 본문 이미지는 블록, 커버는 페이지를 읽는다.
 * 토큰은 요청 머리에만 넣고 오류 메시지에 넣지 않는다.
 * @codocs [[Notion 이미지 제공:가져오는 시점]]
 * @codocs [[콘텐츠 원천:연동 토큰]]
 * @param options 만들기 설정
 * @param options.token `seojaewan-images` 연동 토큰
 * @param options.fetch HTTP 요청 함수. 시험에서 가짜 응답을 넣는다
 * @param options.apiOrigin Notion API 주소. 시험에서 가짜 Notion 서버를 넣는다
 * @returns Notion 이미지 원천
 */
export function createNotionImageSource({
  token,
  fetch = globalThis.fetch,
  apiOrigin = NOTION_API_ORIGIN,
}: {
  token: string;
  fetch?: typeof globalThis.fetch;
  apiOrigin?: string;
}): NotionImageSource {
  /**
   * Notion API에 GET 요청을 보내 JSON을 받는다. 429는 알려 준 시간만큼 기다렸다 다시 보낸다.
   * @param path API 경로
   * @returns 응답 JSON
   */
  async function request(path: string): Promise<unknown> {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(new URL(path, apiOrigin), {
          headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_API_VERSION },
          signal: AbortSignal.timeout(NOTION_TIMEOUT_MS),
        });
      } catch (error) {
        throw new ImageUpstreamError(`Notion ${path}에 닿지 않았다: ${describe(error)}`);
      }
      if (response.status === 429 && attempt < NOTION_RETRY_LIMIT) {
        await wait(Number(response.headers.get('Retry-After') ?? NOTION_DEFAULT_RETRY_SECONDS));
        continue;
      }
      const json: unknown = await response.json().catch(() => null);
      if (response.ok) {
        return json;
      }
      const error = errorSchema.safeParse(json);
      const code = error.success ? error.data.code : '';
      if (NOT_FOUND_CODES.some((notFound) => notFound === code)) {
        throw new ImageNotFoundError(`Notion ${path}: ${code}`);
      }
      const reason = error.success ? `${code}: ${error.data.message}` : '';
      throw new ImageUpstreamError(
        `Notion ${path} 요청이 실패했다(${String(response.status)}) ${reason}`,
      );
    }
  }

  return {
    async getImage({ kind, id }) {
      if (kind === 'block') {
        const block = parse(blockSchema, await request(`/v1/blocks/${id}`), id);
        if (block.type !== 'image' || block.image === undefined || block.in_trash === true) {
          throw new ImageNotFoundError(`이미지 블록이 아니다: ${id}`);
        }
        return { version: getBlockVersion(block.last_edited_time), url: fileUrl(block.image) };
      }
      const page = parse(pageSchema, await request(`/v1/pages/${id}`), id);
      if (page.cover === null || page.in_trash === true) {
        throw new ImageNotFoundError(`커버가 없다: ${id}`);
      }
      const url = fileUrl(page.cover);
      return { version: getCoverVersion({ type: page.cover.type, url }), url };
    },
  };
}

/**
 * Notion 응답을 스키마로 검증한다. 맞지 않으면 Notion 응답이 바뀐 것으로 보고 알린다.
 * @param schema 스키마
 * @param json 응답
 * @param id 블록·페이지 ID
 * @returns 검증한 응답
 */
function parse<T>(schema: z.ZodType<T>, json: unknown, id: string): T {
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ImageUpstreamError(`Notion 응답 모양이 다르다(${id}): ${result.error.message}`);
  }
  return result.data;
}

/**
 * 이미지 파일의 주소를 꺼낸다.
 * @param file Notion 파일
 * @returns 내려받을 주소
 */
function fileUrl(file: z.infer<typeof fileSchema>): string {
  return file.type === 'file' ? file.file.url : file.external.url;
}

/**
 * 오류를 한 줄로 바꾼다.
 * @param error 오류
 * @returns 오류 메시지
 */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 정한 시간만큼 기다린다.
 * @param seconds 기다릴 시간(초)
 * @returns 기다린 뒤 끝나는 Promise
 */
function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}
