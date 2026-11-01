import { renderHook } from '@testing-library/react';
import { act, createElement, type JSX } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSolidSearchIcon } from './use-solid-search-icon';

const SAFARI_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const CHROMIUM_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * 훅의 값을 글자로 그리는 확인용 컴포넌트다.
 * @returns 훅의 값을 담은 span
 */
function Probe(): JSX.Element {
  return createElement('span', null, String(useSolidSearchIcon()));
}

// @codocs [[검색:입력칸]]
describe('useSolidSearchIcon', () => {
  it('Safari에서는 단색 돋보기를 쓴다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(SAFARI_USER_AGENT);

    const { result } = renderHook(() => useSolidSearchIcon());

    expect(result.current).toBe(true);
  });

  it('Safari 문자열이 있는 Chromium에서는 그라데이션을 유지한다', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(CHROMIUM_USER_AGENT);

    const { result } = renderHook(() => useSolidSearchIcon());

    expect(result.current).toBe(false);
  });

  it('Safari 대체는 서버 HTML과 수화가 어긋나지 않는다', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(SAFARI_USER_AGENT);
    const host = document.createElement('div');
    host.innerHTML = renderToString(createElement(Probe));
    expect(host.textContent).toBe('false');
    document.body.append(host);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(host, createElement(Probe), { onRecoverableError });
        await Promise.resolve();
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(host.textContent).toBe('true');
    } finally {
      await act(async () => {
        root?.unmount();
        await Promise.resolve();
      });
      host.remove();
    }
  });
});
