import { describe, expect, it, vi } from 'vitest';

import {
  NOTION_FIXTURE_DATABASE_IDS,
  NOTION_FIXTURE_PAGE_ID,
} from '@/content/content-collections/content-collections';

import { createNotionFixtureClient, loadNotionFixtureClient } from './notion-fixture';

vi.mock('server-only', () => ({}));

// @codocs [[콘텐츠 원천:읽는 곳]]
describe('콘텐츠 원천:읽는 곳', () => {
  it('가짜 클라이언트는 저장한 Notion API 응답을 그대로 돌려준다', async () => {
    const response = { object: 'database', data_sources: [{ id: 'ds' }] };
    const client = createNotionFixtureClient({ 'GET /v1/databases/db': response });
    expect(await client.request({ kind: 'retrieve-database', databaseId: 'db' })).toBe(response);
  });

  it('저장하지 않은 요청은 조용히 넘기지 않고 오류다', async () => {
    const client = createNotionFixtureClient({});
    await expect(client.request({ kind: 'retrieve-database', databaseId: 'db' })).rejects.toThrow(
      '저장하지 않은 요청이다: GET /v1/databases/db',
    );
  });

  it('저장한 fixture에는 세 묶음의 데이터베이스와 시험용 페이지의 응답이 있다', async () => {
    const client = await loadNotionFixtureClient();
    for (const databaseId of Object.values(NOTION_FIXTURE_DATABASE_IDS)) {
      await expect(
        client.request({ kind: 'retrieve-database', databaseId }),
      ).resolves.toMatchObject({ object: 'database' });
    }
    await expect(
      client.request({
        kind: 'list-block-children',
        blockId: NOTION_FIXTURE_PAGE_ID,
        startCursor: null,
      }),
    ).resolves.toMatchObject({ object: 'list' });
  });

  it('저장한 fixture에는 만료되는 이미지 주소와 외부 이미지 주소가 없다', async () => {
    const { default: responses } = await import('./notion-responses.json');
    const text = JSON.stringify(responses);
    expect(text).not.toMatch(/X-Amz|secure\.notion-static|prod-files-secure/u);
    expect(text).not.toContain('notion.so/images');
  });
});
