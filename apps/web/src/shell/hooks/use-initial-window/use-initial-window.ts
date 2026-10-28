import { useEffect, useState } from 'react';

import { useWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { createChromeContent } from '@/shared/utils/chrome-tabs/chrome-tabs';

/** 주소로 처음 들어왔을 때 열어 둘 Chrome 페이지. 글 주소면 그 글, 해당하는 글이 없으면 찾을 수 없음 화면이다 */
export type InitialPage = { kind: 'post'; slug: string } | { kind: 'not-found' };

// 찾을 수 없음 화면에 보일 주소의 호스트다(주소창의 글 주소와 같다).
const BLOG_HOST = 'seojaewan.com';

/**
 * 주소로 처음 들어오거나 새로고침했을 때, 주소에 해당하는 Chrome 창 하나를 열어 둔 채로 시작한다.
 * 창은 작업 영역 크기를 안 뒤(마운트 뒤) 한 번만 연다. 찾을 수 없음 화면에는 들어온 주소(`seojaewan.com/<경로>`)를 보인다.
 * 다시 시작해도 다시 열지 않는다(다시 시작하면 바탕화면만 보인다).
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @param initialPage 열어 둘 페이지. 없으면(`/`) 아무 창도 열지 않는다
 * @returns 아직 첫 창을 열지 않았는지. 그동안 브라우저 주소를 바꾸지 않는다
 */
export function useInitialWindow(initialPage: InitialPage | null): boolean {
  const workArea = useWorkArea();
  const openWindow = useWindowStore((state) => state.open);
  const [hasOpened, setHasOpened] = useState(false);
  const isPending = initialPage !== null && !hasOpened;

  useEffect(
    /** 작업 영역 크기를 알면 첫 창을 연다. */
    () => {
      if (!isPending || workArea === null) {
        return;
      }
      const page =
        initialPage.kind === 'post'
          ? initialPage
          : { kind: 'not-found' as const, url: `${BLOG_HOST}${window.location.pathname}` };
      openWindow('chrome', workArea, createChromeContent(page));
      setHasOpened(true);
    },
    [initialPage, isPending, openWindow, workArea],
  );

  return isPending;
}
