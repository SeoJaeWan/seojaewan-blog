import { describe, expect, it } from 'vitest';

import { getPostPath, isSamePost, parsePostPath } from './post-address';

// @codocs [[Chrome:글 주소]]
describe('Chrome:글 주소', () => {
  it('묶음마다 주소의 첫 마디가 다르다', () => {
    expect(getPostPath({ collection: 'blog', slug: 'react-19-hooks' })).toBe(
      '/posts/react-19-hooks',
    );
    expect(getPostPath({ collection: 'project', slug: 'this-blog' })).toBe('/projects/this-blog');
    expect(getPostPath({ collection: 'about', slug: 'resume' })).toBe('/about/resume');
  });

  it('세 묶음의 글 주소를 읽고, 끝의 /는 받는다', () => {
    expect(parsePostPath('/posts/react-19-hooks')).toEqual({
      collection: 'blog',
      slug: 'react-19-hooks',
    });
    expect(parsePostPath('/projects/this-blog/')).toEqual({
      collection: 'project',
      slug: 'this-blog',
    });
    expect(parsePostPath('/about/resume')).toEqual({ collection: 'about', slug: 'resume' });
  });

  it('묶음 경로만이거나 다른 경로는 글 주소가 아니다', () => {
    expect(parsePostPath('/posts')).toBeNull();
    expect(parsePostPath('/projects/')).toBeNull();
    expect(parsePostPath('/blog/react-19-hooks')).toBeNull();
    expect(parsePostPath('/posts/a/b')).toBeNull();
    expect(parsePostPath('/posts/%E0%A4%A')).toBeNull();
  });

  it('slug가 같아도 묶음이 다르면 다른 글이다', () => {
    expect(isSamePost({ collection: 'blog', slug: 'a' }, { collection: 'about', slug: 'a' })).toBe(
      false,
    );
    expect(isSamePost({ collection: 'about', slug: 'a' }, { collection: 'about', slug: 'a' })).toBe(
      true,
    );
  });
});
