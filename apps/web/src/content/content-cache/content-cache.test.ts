import { cacheTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readContentRows } from '@/content/post-source/post-source';
import { getTocHeadings, type PostBlock } from '@/shared/utils/post-body/post-body';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

import {
  CONTENT_INDEX_TAG,
  getContentBody,
  getContentIndex,
  getContentSlugs,
  getPageCacheTag,
} from './content-cache';

vi.mock('server-only', () => ({}));
// 캐시 함수(`'use cache'`)는 Next.js 밖에서 그냥 함수로 돈다. 붙인 태그만 기록한다.
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

beforeEach(() => {
  vi.mocked(cacheTag).mockClear();
});

/**
 * Blog 묶음의 색인.
 * @returns Blog 글 색인
 */
async function getPostIndex(): Promise<PostSummary[]> {
  return (await getContentIndex()).filter((post) => post.collection === 'blog');
}

/**
 * 모든 공개 글의 본문 블록을 읽는다.
 * @returns 글마다의 본문 블록
 */
async function allBodies(): Promise<(readonly PostBlock[])[]> {
  const index = await getPostIndex();
  const bodies = await Promise.all(index.map((post) => getContentBody(post)));
  return bodies.map((body) => body?.blocks ?? []);
}

/**
 * 본문의 모든 링크 주소.
 * @param blocks 본문 블록
 * @returns 링크 주소
 */
function linksOf(blocks: readonly PostBlock[]): string[] {
  return blocks.flatMap((block) =>
    'richText' in block ? block.richText.flatMap((part) => part.link ?? []) : [],
  );
}

// @codocs [[콘텐츠 원천:읽는 곳]]
describe('콘텐츠 원천:읽는 곳', () => {
  it('fixture 모드는 저장한 응답을 운영과 같은 변환으로 읽어 글 색인을 만든다', async () => {
    expect(await getPostIndex()).toEqual([
      {
        collection: 'blog',
        slug: 'notion-blog-migration',
        title: 'Notion 블로그 이전기',
        folderPath: [],
        date: '2026-10-24',
      },
      {
        collection: 'blog',
        slug: 'react-19-hooks',
        title: 'React 19 훅 정리',
        folderPath: ['React'],
        date: '2026-10-20',
      },
      {
        collection: 'blog',
        slug: 'react-server-components',
        title: '리액트 서버 컴포넌트 이해하기',
        folderPath: ['React'],
        date: '2026-10-12',
      },
      {
        collection: 'blog',
        slug: 'nextjs-app-router-cache',
        title: 'Next.js App Router 캐시',
        folderPath: ['Next.js'],
        date: '2026-10-03',
      },
      {
        collection: 'blog',
        slug: 'react-compiler',
        title: 'React Compiler 도입기',
        folderPath: ['React'],
        date: '2026-09-28',
      },
      {
        collection: 'blog',
        slug: 'typescript-5-6',
        title: 'TypeScript 5.6 새 기능',
        folderPath: ['TypeScript'],
        date: '2026-09-25',
      },
      {
        collection: 'blog',
        slug: 'nextjs-on-demand-revalidation',
        title: 'Next.js on-demand revalidation',
        folderPath: ['Next.js'],
        date: '2026-09-05',
      },
      {
        collection: 'blog',
        slug: 'use-effect-dependencies',
        title: 'useEffect 의존성 배열 다루기',
        folderPath: ['React', 'Hooks'],
        date: '2026-08-30',
      },
      {
        collection: 'blog',
        slug: 'typescript-generics',
        title: 'TypeScript 제네릭 활용',
        folderPath: ['TypeScript'],
        date: '2026-08-14',
      },
      {
        collection: 'blog',
        slug: '2026-first-half-retrospective',
        title: '2026 상반기 회고',
        folderPath: [],
        date: '2026-07-01',
      },
    ]);
  });
});

// @codocs [[콘텐츠 원천:데이터베이스]]
describe('콘텐츠 원천:데이터베이스', () => {
  it('색인은 세 묶음의 공개 항목을 묶음과 함께 담는다', async () => {
    const index = await getContentIndex();
    expect(index.filter((post) => post.collection === 'project').map((post) => post.slug)).toEqual([
      'fixture-project',
    ]);
    expect(index.filter((post) => post.collection === 'about').map((post) => post.slug)).toEqual([
      'fixture-about',
    ]);
  });

  it('blog·project·about 세 묶음을 같은 방법으로 읽는다', async () => {
    expect((await readContentRows('project')).map((row) => row.slug)).toEqual(['fixture-project']);
    expect((await readContentRows('about')).map((row) => row.slug)).toEqual(['fixture-about']);
  });

  it('project·about 항목의 본문도 같은 변환을 지난다', async () => {
    expect(
      (await getContentBody({ collection: 'project', slug: 'fixture-project' }))?.blocks.length,
    ).toBeGreaterThan(0);
    expect(
      (await getContentBody({ collection: 'about', slug: 'fixture-about' }))?.blocks.length,
    ).toBeGreaterThan(0);
  });

  it('커버는 있는 항목에만 있다', async () => {
    const [project] = await readContentRows('project');
    expect(project?.cover).toMatch(/^https:\/\/images\.seojaewan\.com\/notion\/cover\//u);
    expect((await readContentRows('about'))[0]?.cover).toBeNull();
  });
});

// @codocs [[콘텐츠 원천:갱신 방식]]
describe('콘텐츠 원천:갱신 방식', () => {
  it('목록은 세 묶음 모두 목록 태그로 캐시한다', async () => {
    await getContentIndex();
    expect(vi.mocked(cacheTag).mock.calls).toEqual([
      [CONTENT_INDEX_TAG],
      [CONTENT_INDEX_TAG],
      [CONTENT_INDEX_TAG],
    ]);
  });

  it('본문은 그 페이지의 태그로 캐시해, 웹훅이 그 페이지만 다시 만들게 한다', async () => {
    const [row] = await readContentRows('project');
    await getContentBody({ collection: 'project', slug: 'fixture-project' });
    expect(row).toBeDefined();
    expect(vi.mocked(cacheTag)).toHaveBeenCalledWith(getPageCacheTag(row?.pageId ?? ''));
  });

  it('공개하지 않은 항목은 본문을 읽지 않아 페이지 태그도 없다', async () => {
    await getContentBody({ collection: 'project', slug: 'hidden-project' });
    expect(vi.mocked(cacheTag).mock.calls.flat()).toEqual([CONTENT_INDEX_TAG]);
  });

  it('페이지 태그는 하이픈과 대소문자가 달라도 같은 페이지면 같다', () => {
    expect(getPageCacheTag('410C97BA-FD89-8146-A87A-ECA9B3451C50')).toBe(
      getPageCacheTag('410c97bafd898146a87aeca9b3451c50'),
    );
  });
});

// @codocs [[SEO와 공유 미리보기:첫 HTML]]
describe('SEO와 공유 미리보기:첫 HTML', () => {
  it('빌드할 때 만들 페이지는 묶음마다 공개 항목의 slug다', async () => {
    expect(await getContentSlugs('project')).toEqual(['fixture-project']);
    expect(await getContentSlugs('about')).toEqual(['fixture-about']);
  });
});

// @codocs [[Notion 이미지 제공:크기]]
describe('Notion 이미지 제공:크기', () => {
  it('fixture 모드는 이미지 서버에 묻지 않고 커버를 저장소 안의 시험 이미지와 그 원본 크기로 그린다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const body = await getContentBody({ collection: 'project', slug: 'fixture-project' });
    expect(body?.cover?.url).toMatch(/notion-test-image\.png$/u);
    expect(body?.cover).toMatchObject({ width: 16, height: 9 });
    expect(
      (await getContentBody({ collection: 'blog', slug: 'react-19-hooks' }))?.cover,
    ).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

// @codocs [[콘텐츠 원천:공개 여부]]
describe('콘텐츠 원천:공개 여부', () => {
  it('공개하지 않은 행은 목록에 없고 본문도 없다(null)', async () => {
    expect((await readContentRows('blog')).some((row) => row.title === '쓰는 중인 글')).toBe(false);
    expect(await getContentBody({ collection: 'project', slug: 'hidden-project' })).toBeNull();
    expect(await getContentBody({ collection: 'about', slug: 'hidden-about' })).toBeNull();
  });
});

// @codocs [[콘텐츠 원천:결정]]
describe('콘텐츠 원천:결정', () => {
  it('색인에 있는 글은 본문 스키마에 맞는 본문을 돌려준다', async () => {
    const body = await getContentBody({ collection: 'blog', slug: 'react-19-hooks' });
    expect(body?.blocks.length).toBeGreaterThan(0);
  });

  it('색인에 없는 글은 본문이 없다(null)', async () => {
    expect(await getContentBody({ collection: 'blog', slug: 'none' })).toBeNull();
  });
});

// @codocs [[기술 스택:글 본문 처리]]
describe('기술 스택:글 본문 처리', () => {
  it('본문을 보낼 때 코드 강조와 수식 HTML을 서버에서 채운다', async () => {
    const blocks = (await allBodies()).flat();
    const codes = blocks.filter((block) => block.type === 'code');
    const equations = blocks.filter((block) => block.type === 'equation');
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((block) => block.highlighted !== undefined)).toBe(true);
    expect(equations.length).toBeGreaterThan(0);
    expect(equations.every((block) => block.html?.includes('katex') === true)).toBe(true);
  });
});

// 문서 규칙이 아니라 blog fixture가 글 화면을 확인할 만큼의 글을 갖췄는지 본다(E2E가 이 글들을 쓴다).
describe('blog fixture', () => {
  it('목차가 보이는 글과 보이지 않는 글이 있다', async () => {
    const tocCounts = (await allBodies()).map((blocks) => getTocHeadings(blocks).length);
    expect(tocCounts.some((count) => count > 0)).toBe(true);
    expect(tocCounts.some((count) => count === 0)).toBe(true);
  });

  it('다른 글 링크는 사이트 안 링크(`/posts/<slug>`)다', async () => {
    const links = linksOf((await allBodies()).flat());
    expect(links.some((link) => link.startsWith('/posts/'))).toBe(true);
    expect(links.some((link) => link.includes('seojaewan.com'))).toBe(false);
  });

  it('외부 링크와 코드 블록이 들어 있다', async () => {
    const blocks = (await allBodies()).flat();
    expect(linksOf(blocks).some((link) => link.startsWith('https://'))).toBe(true);
    expect(blocks.some((block) => block.type === 'code')).toBe(true);
  });
});
