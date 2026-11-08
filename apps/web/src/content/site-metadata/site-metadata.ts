import type { Metadata, MetadataRoute } from 'next';

import type { PostRow } from '@/content/post-schema/post-schema';
import {
  getPostPath,
  type PostCollection,
  type PostRef,
} from '@/shared/utils/post-address/post-address';

/** 사이트 주소. 메타 정보의 상대 주소(canonical, 기본 공유 그림)가 이 주소를 앞에 붙인다 */
export const SITE_ORIGIN = 'https://seojaewan.com';

/** 사이트 이름. 첫 화면의 `<title>`이고 다른 화면의 제목 뒤에 붙는다 */
export const SITE_NAME = 'seojaewan';

/** 첫 화면의 사이트 소개 한 줄. Summary가 없는 항목의 설명으로도 쓴다 */
export const SITE_DESCRIPTION = '서재완의 기술 블로그입니다.';

/** 커버가 없는 항목과 첫 화면의 공유 그림(`public/og-default.png`, `scripts/generate-og-default.ts`가 만든다) */
export const DEFAULT_SHARE_IMAGE = { url: '/og-default.png', width: 1200, height: 630 } as const;

// 공유 그림으로 쓰는 커버 폭. 이미지 서버가 만드는 두 폭 가운데 큰 쪽이다.
const SHARE_IMAGE_WIDTH = 1440;

// 공유 미리보기의 언어와 지역이다. 사이트는 한국어만 제공한다.
const OPEN_GRAPH_LOCALE = 'ko_KR';

/** 공유 미리보기 그림 하나. 크기는 아는 것(기본 그림)만 적는다 */
type ShareImage = {
  url: string;
  width?: number;
  height?: number;
};

/** 글 주소 페이지의 메타 정보를 만드는 데 필요한 항목 값 */
export type EntryMetadataSource = {
  post: PostRef;
  row: Pick<PostRow, 'title' | 'summary' | 'cover'>;
};

/** sitemap에 넣을 공개 항목 하나. 묶음과 slug, 고친 시각이다 */
export type SitemapSource = {
  collection: PostCollection;
  row: Pick<PostRow, 'slug' | 'lastEditedAt'>;
};

/**
 * 모든 화면이 함께 쓰는 메타 정보(루트 레이아웃). 상대 주소의 기준(`metadataBase`), 제목 템플릿, 첫 화면의 제목·설명·공유 그림이다.
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @codocs [[SEO와 공유 미리보기:공유 미리보기 이미지]]
 * @returns 루트 레이아웃의 메타 정보
 */
export function getSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: OPEN_GRAPH_LOCALE,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_SHARE_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_SHARE_IMAGE],
    },
  };
}

/**
 * 첫 화면(`/`)의 메타 정보. 제목·설명·공유 그림은 루트 레이아웃 것을 그대로 쓰고 canonical과 공유 주소만 정한다.
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @returns 첫 화면의 메타 정보
 */
export function getHomeMetadata(): Metadata {
  return {
    alternates: { canonical: '/' },
    openGraph: { ...getSiteMetadata().openGraph, url: '/' },
  };
}

/**
 * 글 주소(`/posts/<slug>`, `/projects/<slug>`, `/about/<slug>`) 페이지의 메타 정보. 제목은 항목 제목(템플릿이 사이트 이름을 붙인다),
 * 설명은 Summary(없으면 사이트 소개), canonical은 묶음별 경로, 공유 그림은 커버의 `?w=1440`이나 기본 그림이다.
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @codocs [[SEO와 공유 미리보기:공유 미리보기 이미지]]
 * @param source 항목 값
 * @param source.post 항목(묶음과 slug)
 * @param source.row 항목의 제목, Summary, 커버
 * @returns 글 주소 페이지의 메타 정보
 */
export function getEntryMetadata({ post, row }: EntryMetadataSource): Metadata {
  const path = getPostPath(post);
  const description = getEntryDescription(row.summary);
  const images = [getShareImage(row.cover)];
  return {
    title: row.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      locale: OPEN_GRAPH_LOCALE,
      url: path,
      title: row.title,
      description,
      images,
    },
    twitter: { card: 'summary_large_image', title: row.title, description, images },
  };
}

/**
 * 항목의 설명(meta description). Notion Summary가 있으면 그대로 쓰고, 비어 있으면 사이트 소개를 쓴다.
 * @codocs [[SEO와 공유 미리보기:메타 정보]]
 * @param summary Notion Summary. 없으면 빈 문자열
 * @returns 설명
 */
export function getEntryDescription(summary: string): string {
  const trimmedSummary = summary.trim();
  return trimmedSummary === '' ? SITE_DESCRIPTION : trimmedSummary;
}

/**
 * 공유 미리보기 그림. 커버가 있으면 커버의 이미지 서버 주소에 큰 폭(`?w=1440`)을 붙인 전체 `https://` 주소이고, 없으면 기본 그림이다.
 * fixture 모드도 같은 이미지 서버 주소를 만든다(본문의 커버는 시험 PNG로 바꿔 그리지만, 공유 그림은 받지 않으므로 바꾸지 않는다).
 * @codocs [[SEO와 공유 미리보기:공유 미리보기 이미지]]
 * @codocs [[Notion 이미지 제공:최적화]]
 * @param cover 커버의 이미지 서버 주소. 없으면 null
 * @returns 공유 그림
 */
export function getShareImage(cover: string | null): ShareImage {
  if (cover === null) {
    return DEFAULT_SHARE_IMAGE;
  }
  const url = new URL(cover);
  url.searchParams.set('w', String(SHARE_IMAGE_WIDTH));
  return { url: url.href };
}

/**
 * sitemap 항목. 첫 화면과 세 묶음의 공개 항목이고, `lastModified`는 Notion `last_edited_time`이다.
 * 첫 화면은 모든 항목 가운데 가장 늦게 고친 시각이다(첫 화면의 바탕화면 폴더가 그 항목들을 보인다).
 * @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
 * @param entries 묶음과 공개 행
 * @returns sitemap
 */
export function getSitemapEntries(entries: readonly SitemapSource[]): MetadataRoute.Sitemap {
  const latest = entries
    .map(({ row }) => row.lastEditedAt)
    .reduce<string | undefined>(
      (left, right) => (left === undefined || Date.parse(right) > Date.parse(left) ? right : left),
      undefined,
    );
  return [
    { url: `${SITE_ORIGIN}/`, ...(latest === undefined ? {} : { lastModified: latest }) },
    ...entries.map(({ collection, row }) => ({
      url: `${SITE_ORIGIN}${getPostPath({ collection, slug: row.slug })}`,
      lastModified: row.lastEditedAt,
    })),
  ];
}

/**
 * robots.txt. 모두 허용하고 서버 경로(`/api/`)만 막으며 sitemap 주소를 알린다.
 * @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
 * @returns robots
 */
export function getRobots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
