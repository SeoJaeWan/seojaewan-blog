import type { MetadataRoute } from 'next';

import { getContentRows } from '@/content/content-cache/content-cache';
import { getSitemapEntries } from '@/content/site-metadata/site-metadata';

/**
 * `/sitemap.xml`. 첫 화면과 세 묶음의 공개 항목이다. 목록과 같은 태그로 캐시한 행을 읽어, 웹훅이 오면 함께 갱신된다.
 * @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
 * @returns sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries(await getContentRows());
}
