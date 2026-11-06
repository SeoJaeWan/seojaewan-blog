import { describe, expect, it, vi } from 'vitest';

import { getTocHeadings, type PostBlock } from '@/shared/utils/post-body/post-body';

import { getContentBody, getContentRows, getPostBody, getPostIndex } from './post-source';

vi.mock('server-only', () => ({}));

/**
 * 모든 공개 글의 본문 블록을 읽는다.
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
    'richText' in block ? block.richText.flatMap((part) => part.link ?? []) : [],
  );
}

// @codocs [[콘텐츠 원천:읽는 곳]]
describe('콘텐츠 원천:읽는 곳', () => {
  it('fixture 모드는 저장한 응답을 운영과 같은 변환으로 읽어 글 색인을 만든다', async () => {
    expect(await getPostIndex()).toEqual([
      {
        slug: 'notion-blog-migration',
        title: 'Notion 블로그 이전기',
        folderPath: [],
        date: '2026-10-24',
      },
      {
        slug: 'react-19-hooks',
        title: 'React 19 훅 정리',
        folderPath: ['React'],
        date: '2026-10-20',
      },
      {
        slug: 'react-server-components',
        title: '리액트 서버 컴포넌트 이해하기',
        folderPath: ['React'],
        date: '2026-10-12',
      },
      {
        slug: 'nextjs-app-router-cache',
        title: 'Next.js App Router 캐시',
        folderPath: ['Next.js'],
        date: '2026-10-03',
      },
      {
        slug: 'react-compiler',
        title: 'React Compiler 도입기',
        folderPath: ['React'],
        date: '2026-09-28',
      },
      {
        slug: 'typescript-5-6',
        title: 'TypeScript 5.6 새 기능',
        folderPath: ['TypeScript'],
        date: '2026-09-25',
      },
      {
        slug: 'nextjs-on-demand-revalidation',
        title: 'Next.js on-demand revalidation',
        folderPath: ['Next.js'],
        date: '2026-09-05',
      },
      {
        slug: 'use-effect-dependencies',
        title: 'useEffect 의존성 배열 다루기',
        folderPath: ['React', 'Hooks'],
        date: '2026-08-30',
      },
      {
        slug: 'typescript-generics',
        title: 'TypeScript 제네릭 활용',
        folderPath: ['TypeScript'],
        date: '2026-08-14',
      },
      {
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
  it('blog·project·about 세 묶음을 같은 방법으로 읽는다', async () => {
    expect((await getContentRows('project')).map((row) => row.slug)).toEqual(['fixture-project']);
    expect((await getContentRows('about')).map((row) => row.slug)).toEqual(['fixture-about']);
  });

  it('project·about 항목의 본문도 같은 변환을 지난다', async () => {
    expect((await getContentBody('project', 'fixture-project'))?.blocks.length).toBeGreaterThan(0);
    expect((await getContentBody('about', 'fixture-about'))?.blocks.length).toBeGreaterThan(0);
  });

  it('커버는 있는 항목에만 있다', async () => {
    const [project] = await getContentRows('project');
    expect(project?.cover).toMatch(/^https:\/\/images\.seojaewan\.com\/notion\/cover\//u);
    expect((await getContentRows('about'))[0]?.cover).toBeNull();
  });
});

// @codocs [[콘텐츠 원천:공개 여부]]
describe('콘텐츠 원천:공개 여부', () => {
  it('공개하지 않은 행은 목록에 없고 본문도 없다(null)', async () => {
    expect((await getContentRows('blog')).some((row) => row.title === '쓰는 중인 글')).toBe(false);
    expect(await getContentBody('project', 'hidden-project')).toBeNull();
    expect(await getContentBody('about', 'hidden-about')).toBeNull();
  });
});

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
