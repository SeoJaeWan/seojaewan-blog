import { describe, expect, it, vi } from 'vitest';

import { getTocHeadings, type PostBlock } from '@/shared/utils/post-body/post-body';

import { getPostBody, getPostIndex } from './post-source';

vi.mock('server-only', () => ({}));

/**
 * 모든 임시 글의 본문 블록을 읽는다.
 * @returns 글마다의 본문 블록
 */
async function allBodies(): Promise<(readonly PostBlock[])[]> {
  const index = await getPostIndex();
  const bodies = await Promise.all(index.map((post) => getPostBody(post.slug)));
  return bodies.map((body) => body?.blocks ?? []);
}

/**
 * 본문의 모든 링크 주소.
 * @param blocks 본문 블록
 * @returns 링크 주소
 */
function linksOf(blocks: readonly PostBlock[]): string[] {
  return blocks.flatMap((block) =>
    block.type === 'code' ? [] : block.richText.flatMap((part) => part.link ?? []),
  );
}

// @codocs [[콘텐츠 원천:결정]]
describe('콘텐츠 원천:결정', () => {
  it('색인에 있는 글은 본문 스키마에 맞는 본문을 돌려준다', async () => {
    const body = await getPostBody('react-19-hooks');
    expect(body?.blocks.length).toBeGreaterThan(0);
  });

  it('색인에 없는 글은 본문이 없다(null)', async () => {
    expect(await getPostBody('none')).toBeNull();
  });
});

// 문서 규칙이 아니라 임시 글 원천(9단계에서 Notion으로 바뀐다)이 글 화면을 확인할 만큼의 글을 갖췄는지 본다.
describe('임시 글 원천', () => {
  it('임시 글에는 목차가 보이는 글이 있다', async () => {
    const tocCounts = (await allBodies()).map((blocks) => getTocHeadings(blocks).length);
    expect(tocCounts.some((count) => count > 0)).toBe(true);
  });

  it('임시 글에는 목차가 보이지 않는 글이 있다', async () => {
    const tocCounts = (await allBodies()).map((blocks) => getTocHeadings(blocks).length);
    expect(tocCounts.some((count) => count === 0)).toBe(true);
  });

  it('임시 글에는 다른 글 링크가 들어 있다', async () => {
    const links = linksOf((await allBodies()).flat());
    expect(links.some((link) => link.includes('/posts/'))).toBe(true);
  });

  it('임시 글에는 외부 링크가 들어 있다', async () => {
    const links = linksOf((await allBodies()).flat());
    expect(
      links.some((link) => !link.includes('seojaewan.com') && link.startsWith('https://')),
    ).toBe(true);
  });

  it('임시 글에는 코드 블록이 들어 있다', async () => {
    const blocks = (await allBodies()).flat();
    expect(blocks.some((block) => block.type === 'code')).toBe(true);
  });
});
