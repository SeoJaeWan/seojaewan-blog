import { describe, expect, it } from 'vitest';

import { getItemLink } from './item-link';

const BASE = { name: '항목', parentId: null, trash: null, date: null } as const;

// @codocs [[파일 탐색기:우클릭 메뉴]]
describe('파일 탐색기:우클릭 메뉴', () => {
  it('글의 링크는 공유 링크다', () => {
    const post = { ...BASE, id: 'post:a', kind: 'post', slug: 'a', date: '2026-10-20' } as const;
    expect(getItemLink(post, 'https://blog.test')).toBe('https://blog.test/posts/a');
  });

  it('외부 링크의 링크는 그 주소다', () => {
    const link = {
      ...BASE,
      id: 'link:g',
      kind: 'link',
      url: 'https://github.com',
      icon: 'illustrations/file-link.svg',
    } as const;
    expect(getItemLink(link, 'https://blog.test')).toBe('https://github.com');
  });

  it('폴더는 링크가 없다', () => {
    expect(getItemLink({ ...BASE, id: 'f', kind: 'folder' }, 'https://blog.test')).toBeNull();
  });
});
