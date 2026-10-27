import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchBox } from './search-box';

afterEach(() => {
  vi.restoreAllMocks();
});

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('SearchBox', () => {
  it('접근성 이름을 갖는 검색 입력창이다', () => {
    render(<SearchBox aria-label="검색" placeholder="검색" />);
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveAttribute('placeholder', '검색');
  });

  it('입력하면 값이 바뀌고 onChange를 부른다', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBox aria-label="검색" onChange={handleChange} />);

    await user.type(screen.getByRole('searchbox', { name: '검색' }), '리액트');

    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('리액트');
    expect(handleChange).toHaveBeenCalled();
  });

  it('Tab으로 입력창에 포커스를 옮긴다', async () => {
    const user = userEvent.setup();
    render(<SearchBox appearance="pill" aria-label="검색" />);

    await user.tab();

    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveFocus();
  });

  // @codocs [[검색:입력칸]]
  it('pill·taskbar는 새 그라데이션 돋보기를 쓰고, disabled·default·web은 단색 돋보기만 둔다', () => {
    const { container, rerender } = render(<SearchBox appearance="pill" aria-label="검색" />);
    expect(container.querySelectorAll('svg')).toHaveLength(2);
    expect(container.querySelector('linearGradient')).not.toBeNull();

    rerender(<SearchBox appearance="pill" aria-label="검색" disabled />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    rerender(<SearchBox aria-label="검색" />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    rerender(<SearchBox appearance="web" aria-label="검색" />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('linearGradient')).toBeNull();
  });

  // @codocs [[검색:입력칸]]
  it('Safari에서는 활성 돋보기를 그라데이션 대신 단색 강조색으로 표시한다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    );
    const { container } = render(<SearchBox appearance="pill" aria-label="검색" />);

    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('linearGradient')).toBeNull();
    expect(container.querySelector('svg')).toHaveClass(
      'group-focus-within:text-accent-fill-default',
    );
  });

  // @codocs [[검색:입력칸]]
  it('Safari 문자열이 있는 Chromium에서는 그라데이션을 유지한다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    );
    const { container } = render(<SearchBox appearance="taskbar" aria-label="검색" />);

    expect(container.querySelectorAll('svg')).toHaveLength(2);
    expect(container.querySelector('linearGradient')).not.toBeNull();
  });

  // @codocs [[검색:입력칸]]
  it('Safari 대체 아이콘은 서버 HTML과 수화가 어긋나지 않는다', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    );
    const host = document.createElement('div');
    host.innerHTML = renderToString(<SearchBox appearance="pill" aria-label="검색" />);
    expect(host.querySelectorAll('svg')).toHaveLength(2);
    document.body.append(host);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(host, <SearchBox appearance="pill" aria-label="검색" />, {
          onRecoverableError,
        });
        await Promise.resolve();
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(host.querySelectorAll('svg')).toHaveLength(1);
    } finally {
      await act(async () => {
        root?.unmount();
        await Promise.resolve();
      });
      host.remove();
    }
  });

  it('disabled면 입력할 수 없다', async () => {
    const user = userEvent.setup();
    render(<SearchBox aria-label="검색" disabled defaultValue="리액트" />);

    await user.type(screen.getByRole('searchbox', { name: '검색' }), '뷰');

    expect(screen.getByRole('searchbox', { name: '검색' })).toBeDisabled();
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('리액트');
  });
});
