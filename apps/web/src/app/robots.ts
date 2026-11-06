import type { MetadataRoute } from 'next';

import { getRobots } from '@/content/site-metadata/site-metadata';

/**
 * `/robots.txt`. 모두 허용하고 `/api/`를 막으며 sitemap 주소를 알린다.
 * @codocs [[SEO와 공유 미리보기:sitemap과 robots]]
 * @returns robots
 */
export default function robots(): MetadataRoute.Robots {
  return getRobots();
}
