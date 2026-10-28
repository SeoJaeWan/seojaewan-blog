import { describe, expect, it, vi } from 'vitest';

import { postBodySchema } from '@/shared/utils/post-body/post-body';

import { GET } from './route';

vi.mock('server-only', () => ({}));

/**
 * 글 본문 경로를 부른다.
 * @param slug 글 slug
 * @returns 응답
 */
function requestBody(slug: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/posts/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

// @codocs [[코드 작성 규칙:React와 Next.js]]
describe('코드 작성 규칙:React와 Next.js', () => {
  it('글 본문은 서버 경로가 JSON으로 돌려준다', async () => {
    const response = await requestBody('react-19-hooks');
    expect(response.status).toBe(200);
    const body = postBodySchema.parse(await response.json());
    expect(body.blocks.length).toBeGreaterThan(0);
  });

  it('색인에 없는 글은 404다', async () => {
    expect((await requestBody('none')).status).toBe(404);
  });
});
