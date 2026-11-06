import 'server-only';

import { z } from 'zod';

import type { ImageSizeReader } from '@/content/image-size/image-size';
import { toPostBlocks } from '@/content/notion-blocks/notion-blocks';
import {
  type NotionBlockNode,
  type NotionClient,
  readBlockTree,
  readDatabasePages,
} from '@/content/notion-client/notion-client';
import { isPublicNotionPage, readPostRows } from '@/content/notion-rows/notion-rows';
import { POST_COLLECTIONS, type PostCollection } from '@/shared/utils/post-address/post-address';
import type { PostBlock } from '@/shared/utils/post-body/post-body';

/**
 * 내보낸 글 JSON의 위치(`apps/web` 기준). 글 JSON은 이 폴더(`apps/web/content/`)에만 둔다.
 * 배포가 "글 JSON만 바뀐 병합"을 이 경로로 알아본다.
 */
export const NOTION_EXPORT_PATH = 'content/notion.json';

const blockNodeSchema: z.ZodType<NotionBlockNode> = z.lazy(() =>
  z.object({ block: z.unknown(), children: z.array(blockNodeSchema) }),
);

const imageSizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** 이미지 크기. 내보내기가 이미지 서버에 물어 저장한다 */
export type ImageSize = z.infer<typeof imageSizeSchema>;

/**
 * 내보낸 글 JSON의 모양. Notion API 응답을 그대로(검증 전) 담고, 빌드가 운영과 시험(fixture)에서 같은 변환을 지난다.
 * - `pages`: 묶음마다 공개 행(Notion 페이지 응답). 비공개 행(초안)은 넣지 않는다.
 * - `blocks`: 공개 행의 페이지 ID마다 본문 블록 나무(`readBlockTree` 결과)
 * - `imageSizes`: 본문 이미지와 커버의 이미지 서버 주소마다 크기. 이미지 서버에서 받지 못했으면 null
 * @codocs [[콘텐츠 원천:결정]]
 * @codocs [[콘텐츠 원천:읽는 곳]]
 */
export const notionExportSchema = z.object({
  pages: z.object({
    blog: z.array(z.unknown()),
    project: z.array(z.unknown()),
    about: z.array(z.unknown()),
  }),
  blocks: z.record(z.string(), z.array(blockNodeSchema)),
  imageSizes: z.record(z.string(), imageSizeSchema.nullable()),
});

/** 내보낸 글 JSON */
export type NotionExport = z.infer<typeof notionExportSchema>;

// 행에서 페이지 ID
const pageIdSchema = z.object({ id: z.string() });

/**
 * 세 묶음의 공개 행과 그 본문 블록을 Notion(또는 fixture 클라이언트)에서 읽는다. 이미지 크기는 비워 둔다(`fillImageSizes`가 채운다).
 * 비공개 행은 넣지 않아, 초안만 바뀌면 결과도 바뀌지 않는다. 같은 응답이면 같은 결과가 나오도록 다듬는다(`toStableExport`).
 * Notion이 한꺼번에 많은 요청을 막으므로 차례대로 읽는다.
 * @codocs [[콘텐츠 원천:데이터베이스]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @param client Notion 클라이언트
 * @param databaseIds 묶음마다의 데이터베이스 ID
 * @returns 이미지 크기가 빈 내보낸 글
 */
export async function readNotionExport(
  client: NotionClient,
  databaseIds: Readonly<Record<PostCollection, string>>,
): Promise<NotionExport> {
  const pages: Record<PostCollection, unknown[]> = { blog: [], project: [], about: [] };
  const blocks: Record<string, NotionBlockNode[]> = {};
  for (const collection of POST_COLLECTIONS) {
    pages[collection] = (await readDatabasePages(client, databaseIds[collection])).filter(
      isPublicNotionPage,
    );
    for (const page of pages[collection]) {
      const { id } = pageIdSchema.parse(page);
      blocks[id] = await readBlockTree(client, id);
    }
  }
  return toStableExport({ pages, blocks, imageSizes: {} });
}

/**
 * 내보낸 글의 본문 이미지와 커버의 이미지 서버 주소를 모은다. 빌드가 그릴 때와 같은 변환(`readPostRows`, `toPostBlocks`)으로 만든다.
 * 공개 행의 필수 값이 틀리면 빌드처럼 오류를 던진다.
 * @codocs [[Notion 이미지 제공:크기]]
 * @param content 내보낸 글
 * @returns 이미지 서버 주소(정렬, 겹치지 않음)
 */
export function listImageAddresses(content: NotionExport): string[] {
  const addresses = new Set<string>();
  for (const collection of POST_COLLECTIONS) {
    for (const row of readPostRows(content.pages[collection])) {
      if (row.cover !== null) {
        addresses.add(row.cover);
      }
      collectImageUrls(toPostBlocks(content.blocks[row.pageId] ?? []), addresses);
    }
  }
  return [...addresses].toSorted();
}

/**
 * 이미지 서버 주소마다 크기를 채운다. 주소는 그림이 바뀌면 함께 바뀌므로, 이전 JSON에서 이미 받은 크기는 다시 묻지 않고 쓴다.
 * 나머지는 이미지 서버에 묻고, 받지 못하면 null로 두고 경고 로그를 남긴다(이미지 서버가 꺼져 있어도 내보내기는 실패하지 않는다).
 * @codocs [[Notion 이미지 제공:크기]]
 * @param addresses 이미지 서버 주소
 * @param previous 이전 JSON의 크기
 * @param readSize 이미지 서버에 크기를 묻는 함수
 * @returns 주소마다의 크기. 받지 못했으면 null
 */
export async function fillImageSizes(
  addresses: readonly string[],
  previous: Readonly<Record<string, ImageSize | null>>,
  readSize: ImageSizeReader,
): Promise<Record<string, ImageSize | null>> {
  const entries = await Promise.all(
    addresses.map(
      /**
       * 주소 하나의 크기. 이전에 받은 크기가 있으면 그것을 쓰고, 없으면 이미지 서버에 묻는다.
       * @param address 이미지 서버 주소
       * @returns 주소와 크기
       */
      async (address): Promise<[string, ImageSize | null]> => {
        const known = previous[address];
        if (known !== undefined && known !== null) {
          return [address, known];
        }
        const size = await readSize(address);
        if (size.kind === 'failed') {
          console.warn(
            `[notion-export] 이미지 크기를 받지 못해 null로 둔다: ${address} (${size.reason})`,
          );
          return [address, null];
        }
        return [address, { width: size.width, height: size.height }];
      },
    ),
  );
  return Object.fromEntries(entries);
}

/**
 * 같은 내용이면 같은 결과가 나오도록 내보낸 글을 다듬는다. 그래야 저장소 diff에 실제로 바뀐 것만 보인다.
 * - 묶음 안의 행은 페이지 ID 차례로 놓는다(Notion 조회 결과의 차례에 기대지 않는다). 본문 블록의 차례는 그대로 둔다.
 * - Notion에 올린 파일(`{ type: 'file', file: { url, expiry_time } }`)의 주소는 요청마다 바뀌는 서명(쿼리)과 만료 시각을 뺀다.
 *   화면은 이 주소를 쓰지 않고 이미지 서버 주소를 쓴다. 만료되는 서명 주소를 저장소에 남기지 않으려는 것이기도 하다.
 * @codocs [[콘텐츠 원천:결정]]
 * @param content 내보낸 글
 * @returns 다듬은 내보낸 글
 */
export function toStableExport(content: NotionExport): NotionExport {
  return notionExportSchema.parse(
    withoutSignedFiles({
      ...content,
      pages: {
        blog: sortPages(content.pages.blog),
        project: sortPages(content.pages.project),
        about: sortPages(content.pages.about),
      },
    }),
  );
}

/**
 * 내보낸 글을 저장할 JSON 글자로 바꾼다. 객체 키를 정렬하고 2칸 들여쓰기에 줄바꿈으로 끝낸다. 같은 값이면 늘 같은 글자다.
 * @codocs [[콘텐츠 원천:결정]]
 * @param content 내보낸 글
 * @returns JSON 글자
 */
export function formatNotionExport(content: NotionExport): string {
  return `${JSON.stringify(sortKeys(toStableExport(content)), null, 2)}\n`;
}

/**
 * 본문 블록(하위 블록 포함)의 이미지 주소를 모은다.
 * @param blocks 본문 블록
 * @param addresses 모을 곳
 */
function collectImageUrls(blocks: readonly PostBlock[], addresses: Set<string>): void {
  for (const block of blocks) {
    if (block.type === 'image') {
      addresses.add(block.url);
    }
    if ('children' in block && block.children !== undefined) {
      collectImageUrls(block.children, addresses);
    }
  }
}

/**
 * 행을 페이지 ID 차례로 놓는다.
 * @param pages 행
 * @returns 정렬한 행
 */
function sortPages(pages: readonly unknown[]): unknown[] {
  return pages.toSorted((a, b) => compareText(pageIdSchema.parse(a).id, pageIdSchema.parse(b).id));
}

/**
 * Notion에 올린 파일의 주소에서 서명(쿼리)과 만료 시각을 뺀다. 하위 값까지 모두 본다.
 * @param value 값
 * @returns 바꾼 값
 */
function withoutSignedFiles(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutSignedFiles);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, withoutSignedFiles(child)]),
  );
  const file = result.file;
  if (result.type === 'file' && typeof file === 'object' && file !== null && 'url' in file) {
    const { url } = file;
    result.file = { url: typeof url === 'string' ? (url.split('?')[0] ?? url) : url };
  }
  return result;
}

/**
 * 객체 키를 정렬한다. 하위 값까지 모두 정렬하고 배열의 차례는 그대로 둔다.
 * @param value 값
 * @returns 키를 정렬한 값
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([a], [b]) => compareText(a, b))
      .map(([key, child]) => [key, sortKeys(child)]),
  );
}

/**
 * 글자를 코드 단위 차례로 비교한다. 실행 환경의 언어 설정(`localeCompare`)에 따라 차례가 달라지지 않게 한다.
 * @param a 앞 글자
 * @param b 뒤 글자
 * @returns a가 앞이면 음수, 같으면 0, 뒤면 양수
 */
function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
