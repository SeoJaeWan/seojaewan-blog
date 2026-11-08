import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SHARE_IMAGE,
  getEntryDescription,
  getEntryMetadata,
  getHomeMetadata,
  getRobots,
  getShareImage,
  getSitemapEntries,
  getSiteMetadata,
  SITE_DESCRIPTION,
} from './site-metadata';

const COVER = 'https://images.seojaewan.com/notion/cover/410c97ba-fd89-8146/0123456789ab';

// @codocs [[SEO와 공유 미리보기:메타 정보]]
describe('SEO와 공유 미리보기:메타 정보', () => {
  it('상대 주소의 기준은 https://seojaewan.com이다', () => {
    expect(String(getSiteMetadata().metadataBase)).toBe('https://seojaewan.com/');
  });

  it('제목 템플릿은 `%s | seojaewan`이고 첫 화면은 seojaewan이다', () => {
    expect(getSiteMetadata().title).toEqual({ default: 'seojaewan', template: '%s | seojaewan' });
  });

  it('첫 화면의 설명은 사이트 소개 한 줄이고 canonical은 /다', () => {
    expect(getSiteMetadata().description).toBe('서재완의 기술 블로그입니다.');
    expect(getHomeMetadata().alternates?.canonical).toBe('/');
  });

  it('항목의 제목은 항목 제목이고 canonical은 묶음별 경로다', () => {
    const row = { title: '시험 프로젝트', summary: '소개', cover: null };
    expect(
      getEntryMetadata({ post: { collection: 'blog', slug: 'react-19-hooks' }, row }),
    ).toMatchObject({ title: '시험 프로젝트', alternates: { canonical: '/posts/react-19-hooks' } });
    expect(
      getEntryMetadata({ post: { collection: 'project', slug: 'this-blog' }, row }).alternates
        ?.canonical,
    ).toBe('/projects/this-blog');
    expect(
      getEntryMetadata({ post: { collection: 'about', slug: 'resume' }, row }).alternates
        ?.canonical,
    ).toBe('/about/resume');
  });

  it('Summary가 있으면 설명은 Summary다', () => {
    expect(getEntryDescription('Notion에서 옮긴 기록')).toBe('Notion에서 옮긴 기록');
  });

  it('Summary가 비어 있으면 바로 사이트 소개를 쓴다', () => {
    expect(getEntryDescription('')).toBe(SITE_DESCRIPTION);
    expect(getEntryDescription(' \n ')).toBe(SITE_DESCRIPTION);
  });

  it('공유 미리보기의 제목·설명·주소도 항목 값이다', () => {
    const metadata = getEntryMetadata({
      post: { collection: 'blog', slug: 'react-19-hooks' },
      row: { title: 'React 19 훅 정리', summary: '요약이다', cover: null },
    });
    expect(metadata.openGraph).toMatchObject({
      title: 'React 19 훅 정리',
      description: '요약이다',
      url: '/posts/react-19-hooks',
    });
    expect(metadata.twitter).toMatchObject({ title: 'React 19 훅 정리' });
  });
});

// @codocs [[SEO와 공유 미리보기:공유 미리보기 이미지]]
describe('SEO와 공유 미리보기:공유 미리보기 이미지', () => {
  it('커버가 있으면 커버의 ?w=1440 전체 https:// 주소를 쓴다', () => {
    expect(getShareImage(COVER)).toEqual({ url: `${COVER}?w=1440` });
    const metadata = getEntryMetadata({
      post: { collection: 'blog', slug: 'notion-blog-migration' },
      row: { title: '제목', summary: '요약', cover: COVER },
    });
    expect(metadata.openGraph?.images).toEqual([{ url: `${COVER}?w=1440` }]);
    expect(metadata.twitter?.images).toEqual([{ url: `${COVER}?w=1440` }]);
  });

  it('커버가 없는 항목은 기본 그림(og-default.png)을 쓴다', () => {
    const metadata = getEntryMetadata({
      post: { collection: 'about', slug: 'resume' },
      row: { title: '제목', summary: '요약', cover: null },
    });
    expect(DEFAULT_SHARE_IMAGE.url).toBe('/og-default.png');
    expect(metadata.openGraph?.images).toEqual([DEFAULT_SHARE_IMAGE]);
    expect(metadata.twitter?.images).toEqual([DEFAULT_SHARE_IMAGE]);
  });

  it('첫 화면은 기본 그림을 쓴다', () => {
    expect(getHomeMetadata().openGraph?.images).toEqual([DEFAULT_SHARE_IMAGE]);
    expect(getSiteMetadata().twitter?.images).toEqual([DEFAULT_SHARE_IMAGE]);
  });
});

// @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
describe('SEO와 공유 미리보기:sitemap과 robots', () => {
  it('sitemap은 첫 화면과 세 묶음의 항목이고, lastModified는 Notion을 고친 시각이다', () => {
    expect(
      getSitemapEntries([
        {
          collection: 'blog',
          row: { slug: 'react-19-hooks', lastEditedAt: '2026-11-01T00:00:00.000Z' },
        },
        {
          collection: 'project',
          row: { slug: 'this-blog', lastEditedAt: '2026-11-05T09:00:00.000Z' },
        },
        { collection: 'about', row: { slug: 'resume', lastEditedAt: '2026-10-01T00:00:00.000Z' } },
      ]),
    ).toEqual([
      { url: 'https://seojaewan.com/', lastModified: '2026-11-05T09:00:00.000Z' },
      {
        url: 'https://seojaewan.com/posts/react-19-hooks',
        lastModified: '2026-11-01T00:00:00.000Z',
      },
      {
        url: 'https://seojaewan.com/projects/this-blog',
        lastModified: '2026-11-05T09:00:00.000Z',
      },
      { url: 'https://seojaewan.com/about/resume', lastModified: '2026-10-01T00:00:00.000Z' },
    ]);
  });

  it('공개 항목이 없으면 sitemap은 첫 화면 하나다', () => {
    expect(getSitemapEntries([])).toEqual([{ url: 'https://seojaewan.com/' }]);
  });

  it('robots는 모두 허용하고 /api/를 막으며 sitemap 주소를 알린다', () => {
    expect(getRobots()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/api/' },
      sitemap: 'https://seojaewan.com/sitemap.xml',
    });
  });
});
