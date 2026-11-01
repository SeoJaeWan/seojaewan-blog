import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { BREAKPOINTS } from '@seojaewan/design-system';

import type { ChromePageLayout } from '@/features/chrome/components/chrome-page/chrome-page';

/**
 * 페이지 영역 너비로 넓은·좁은 모양을 고른다. 경계값은 "이 값 미만"이다.
 * @codocs [[Chrome:글 화면]]
 * @param width 페이지 영역 너비(px)
 * @returns 페이지 모양
 */
export function getChromePageLayout(width: number): ChromePageLayout {
  return width < BREAKPOINTS.chromePageWidth ? 'narrow' : 'wide';
}

/**
 * Chrome 창 페이지 영역의 너비를 지켜보고 넓은·좁은 모양을 돌려준다. 모양이 기기가 아니라 창 너비를 따르므로
 * 창 크기 조절·스냅·최대화에 바로 따라간다. 첫 칠하기 전에 한 번 재고, 그 뒤로는 `ResizeObserver`가 알린다.
 * 알림은 칠하기 직전에 오므로 `flushSync`로 그 프레임 안에 그린다(그냥 상태를 바꾸면 옛 모양이 한 프레임 보인다).
 * 경계를 넘지 않으면 상태가 같아 다시 그리지 않는다. 최소화로 숨긴 창은 너비가 0이라 모양을 그대로 둔다.
 * 창을 끌거나 축소 화면으로 줄이는 것은 변형(transform)이나 자리 이동이라 알림이 오지 않는다.
 * @codocs [[Chrome:글 화면]]
 * @returns 페이지 영역에 붙일 ref와 페이지 모양
 */
export function useChromePageLayout(): {
  areaRef: RefObject<HTMLDivElement | null>;
  layout: ChromePageLayout;
} {
  const areaRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ChromePageLayout>('wide');

  useLayoutEffect(
    /**
     * 페이지 영역을 재고 너비 변화를 지켜본다.
     * @returns 지켜보기를 끝내는 함수
     */
    () => {
      const area = areaRef.current;
      if (area === null) {
        return undefined;
      }
      if (area.offsetWidth > 0) {
        setLayout(getChromePageLayout(area.offsetWidth));
      }
      const observer = new ResizeObserver((entries) => {
        const width = entries.at(-1)?.contentRect.width ?? 0;
        if (width > 0) {
          flushSync(() => {
            setLayout(getChromePageLayout(width));
          });
        }
      });
      observer.observe(area);
      return () => {
        observer.disconnect();
      };
    },
    [],
  );

  return { areaRef, layout };
}
