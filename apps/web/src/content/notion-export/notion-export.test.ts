import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { NOTION_FIXTURE_DATABASE_IDS } from '@/content/content-collections/content-collections';
import type { ImageSizeReader, ImageSizeResult } from '@/content/image-size/image-size';
import { createNotionFixtureClient } from '@/content/notion-fixture/notion-fixture';
import fixtureResponses from '@/content/notion-fixture/notion-responses.json';

import {
  fillImageSizes,
  formatNotionExport,
  listImageAddresses,
  type NotionExport,
  notionExportSchema,
  readNotionExport,
} from './notion-export';

vi.mock('server-only', () => ({}));

// fixture blog 데이터베이스의 데이터 소스 조회 요청 이름과 그 안의 비공개 행(초안), 공개 행 하나
const BLOG_QUERY = 'POST /v1/data_sources/410c97ba-fd89-818b-b16b-000b5c10c560/query';
const DRAFT_PAGE_ID = '410c97ba-fd89-8189-b256-cf814c8dfe75';
const PUBLIC_PAGE_ID = '410c97ba-fd89-819e-a8cf-cc70fb6f4f5f';
const SIGNED_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/cover.png?X-Amz-Signature=';

// 행의 제목 속성. 제목 조각은 응답 사본 안의 값 그대로(참조) 꺼낸다.
const titleSchema = z.object({
  properties: z.object({ 제목: z.object({ title: z.array(z.unknown()).min(1) }) }),
});

/**
 * 저장한 fixture 응답을 고쳐 내보낸다.
 * @param edit 응답 사본을 고치는 함수
 * @returns 내보낸 JSON 글자
 */
async function exportWith(
  edit: (responses: Record<string, unknown>) => void = () => undefined,
): Promise<string> {
  const responses: Record<string, unknown> = structuredClone(fixtureResponses);
  edit(responses);
  const content = await readNotionExport(
    createNotionFixtureClient(responses),
    NOTION_FIXTURE_DATABASE_IDS,
  );
  return formatNotionExport(content);
}

/**
 * fixture blog 데이터 소스 조회 결과의 행 배열.
 * @param responses 응답 사본
 * @returns 행 배열(사본 안의 배열 그대로라 고치면 응답이 바뀐다)
 */
function blogRows(responses: Record<string, unknown>): unknown[] {
  const query = responses[BLOG_QUERY];
  if (isRecord(query) && Array.isArray(query.results)) {
    const results: unknown[] = query.results;
    return results;
  }
  throw new Error('fixture에 blog 조회 응답이 없다');
}

/**
 * 행 하나를 찾는다.
 * @param responses 응답 사본
 * @param pageId 페이지 ID
 * @returns 행(사본 안의 값 그대로)
 */
function blogRow(responses: Record<string, unknown>, pageId: string): Record<string, unknown> {
  const row = blogRows(responses).find((page) => isRecord(page) && page.id === pageId);
  if (!isRecord(row)) {
    throw new Error(`fixture에 ${pageId} 행이 없다`);
  }
  return row;
}

/**
 * 행의 제목을 바꾼다.
 * @param row 행
 * @param title 새 제목
 */
function renameRow(row: Record<string, unknown>, title: string): void {
  const [part] = titleSchema.parse(row).properties.제목.title;
  if (!isRecord(part)) {
    throw new Error('제목이 없는 행이다');
  }
  Object.assign(part, { plain_text: title });
}

/**
 * 객체인지.
 * @param value 값
 * @returns 객체면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @codocs [[콘텐츠 원천:공개 여부]]
describe('콘텐츠 원천:공개 여부', () => {
  it('내보낸 글에는 공개 행과 그 본문만 있고 비공개 행(초안)은 없다', async () => {
    const content = notionExportSchema.parse(JSON.parse(await exportWith()));
    const pageIds = content.pages.blog.map((page) => (isRecord(page) ? page.id : null));
    expect(pageIds).toContain(PUBLIC_PAGE_ID);
    expect(pageIds).not.toContain(DRAFT_PAGE_ID);
    expect(Object.keys(content.blocks)).not.toContain(DRAFT_PAGE_ID);
    expect(content.pages.project).toHaveLength(1);
    expect(content.pages.about).toHaveLength(1);
  });

  it('초안만 바뀌면 내보낸 글이 바뀌지 않는다', async () => {
    const before = await exportWith();
    const after = await exportWith((responses) => {
      renameRow(blogRow(responses, DRAFT_PAGE_ID), '고친 초안 제목');
    });
    expect(after).toBe(before);
  });

  it('공개 행이 바뀌면 내보낸 글도 바뀐다', async () => {
    const before = await exportWith();
    const after = await exportWith((responses) => {
      renameRow(blogRow(responses, PUBLIC_PAGE_ID), '고친 공개 글 제목');
    });
    expect(after).not.toBe(before);
    expect(after).toContain('고친 공개 글 제목');
  });
});

// @codocs [[콘텐츠 원천:결정]]
describe('콘텐츠 원천:결정', () => {
  it('같은 응답이면 같은 JSON 글자를 낸다', async () => {
    expect(await exportWith()).toBe(await exportWith());
  });

  it('Notion이 행을 다른 차례로 주어도 같은 JSON 글자를 낸다', async () => {
    const before = await exportWith();
    const after = await exportWith((responses) => {
      blogRows(responses).reverse();
    });
    expect(after).toBe(before);
  });

  it('객체 키 차례가 달라도 같은 JSON 글자를 낸다', async () => {
    const before = await exportWith();
    const after = await exportWith((responses) => {
      const rows = blogRows(responses);
      const row = blogRow(responses, PUBLIC_PAGE_ID);
      rows[rows.indexOf(row)] = Object.fromEntries(Object.entries(row).reverse());
    });
    expect(after).toBe(before);
  });

  it('요청마다 바뀌는 파일 서명과 만료 시각은 저장하지 않아 같은 JSON 글자를 낸다', async () => {
    /**
     * 공개 행에 서명이 붙은 Notion 파일 커버를 넣는다.
     * @param signature 서명
     * @param expiry 만료 시각
     * @returns 응답을 고치는 함수
     */
    function withSignedCover(signature: string, expiry: string) {
      return (responses: Record<string, unknown>): void => {
        blogRow(responses, PUBLIC_PAGE_ID).cover = {
          type: 'file',
          file: { url: `${SIGNED_URL}${signature}`, expiry_time: expiry },
        };
      };
    }
    const first = await exportWith(withSignedCover('aaa', '2026-11-06T03:00:00.000Z'));
    const second = await exportWith(withSignedCover('bbb', '2026-11-06T04:00:00.000Z'));
    expect(second).toBe(first);
    expect(first).not.toContain('X-Amz-Signature');
    expect(first).not.toContain('expiry_time');
  });

  it('키를 정렬하고 2칸 들여쓰기에 줄바꿈으로 끝낸다', () => {
    const content: NotionExport = {
      pages: { blog: [], project: [], about: [] },
      blocks: {},
      imageSizes: { b: null, a: { width: 2, height: 1 } },
    };
    expect(formatNotionExport(content)).toBe(
      [
        '{',
        '  "blocks": {},',
        '  "imageSizes": {',
        '    "a": {',
        '      "height": 1,',
        '      "width": 2',
        '    },',
        '    "b": null',
        '  },',
        '  "pages": {',
        '    "about": [],',
        '    "blog": [],',
        '    "project": []',
        '  }',
        '}',
        '',
      ].join('\n'),
    );
  });
});

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  it('본문 이미지(하위 블록 안 포함)와 커버의 이미지 서버 주소를 빌드와 같은 변환으로 모은다', async () => {
    const content = notionExportSchema.parse(JSON.parse(await exportWith()));
    const addresses = listImageAddresses(content);
    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses.some((address) => address.includes('/notion/cover/'))).toBe(true);
    expect(addresses.every((address) => address.startsWith('https://images.seojaewan.com/'))).toBe(
      true,
    );
    expect(addresses).toEqual([...new Set(addresses)].toSorted());
  });

  it('이미지 서버에 물어 크기를 채우고, 받지 못하면 null로 두고 경고한다', async () => {
    /**
     * 주소 a만 크기를 주고 나머지는 실패하는 이미지 서버.
     * @param url 주소
     * @returns 크기 결과
     */
    function readSize(url: string): Promise<ImageSizeResult> {
      return Promise.resolve(
        url === 'a'
          ? { kind: 'sized', width: 1440, height: 810 }
          : { kind: 'failed', reason: '상태 502' },
      );
    }
    expect(await fillImageSizes(['a', 'b'], {}, readSize)).toEqual({
      a: { width: 1440, height: 810 },
      b: null,
    });
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('이전 JSON에서 받은 크기는 다시 묻지 않고, 받지 못했던(null) 주소와 새 주소만 묻는다', async () => {
    const readSize = vi.fn<ImageSizeReader>(() =>
      Promise.resolve({ kind: 'sized', width: 720, height: 720 }),
    );
    const sizes = await fillImageSizes(
      ['known', 'unsized', 'new'],
      { known: { width: 1440, height: 810 }, unsized: null, removed: { width: 1, height: 1 } },
      readSize,
    );
    expect(sizes).toEqual({
      known: { width: 1440, height: 810 },
      unsized: { width: 720, height: 720 },
      new: { width: 720, height: 720 },
    });
    expect(readSize.mock.calls.map(([url]) => url)).toEqual(['unsized', 'new']);
  });
});
