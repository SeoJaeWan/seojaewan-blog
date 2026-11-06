import type { MetadataRoute } from 'next';

import { getContentRows } from '@/content/content-store/content-store';
import { getSitemapEntries } from '@/content/site-metadata/site-metadata';

/**
 * `/sitemap.xml`. 첫 화면과 세 묶음의 공개 항목이다. 빌드할 때 만든다.
 * @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
 * @returns sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries(await getContentRows());
}
