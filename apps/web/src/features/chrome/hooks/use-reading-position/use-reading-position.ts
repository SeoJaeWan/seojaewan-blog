import { type RefObject, useEffect, useState } from 'react';

import { getActiveHeadingIndex } from '@/features/chrome/utils/reading-position/reading-position';

/**
 * 글을 스크롤하는 동안 지금 읽는 제목의 차례를 돌려준다. 스크롤 상자의 스크롤과 크기 변화를 듣고, 제목 요소의 자리로 정한다.
 * @codocs [[Chrome:글 화면]]
 * @param scrollRef 글을 담은 스크롤 상자
 * @param headingIds 목차 제목 요소의 id. 본문 차례대로다
 * @returns 지금 읽는 제목의 차례. 제목이 없으면 -1
 */
export function useReadingPosition(
  scrollRef: RefObject<HTMLElement | null>,
  headingIds: readonly string[],
): number {
  const [activeIndex, setActiveIndex] = useState(-1);
  const idsKey = headingIds.join(' ');

  useEffect(
    /** 스크롤 상자의 스크롤과 크기 변화를 듣고, 지금 읽는 제목을 다시 정한다. */
    () => {
      const container = scrollRef.current;
      const ids = idsKey === '' ? [] : idsKey.split(' ');
      if (container === null || ids.length === 0) {
        return undefined;
      }
      const scrollContainer: HTMLElement = container;

      /** 제목 자리와 스크롤 상태로 지금 읽는 제목을 정한다. */
      function update(): void {
        const top = scrollContainer.getBoundingClientRect().top - scrollContainer.scrollTop;
        const headingTops = ids.flatMap((id) => {
          const heading = scrollContainer.querySelector(`#${CSS.escape(id)}`);
          return heading === null ? [] : [heading.getBoundingClientRect().top - top];
        });
        setActiveIndex(
          getActiveHeadingIndex(headingTops, {
            scrollTop: scrollContainer.scrollTop,
            clientHeight: scrollContainer.clientHeight,
            scrollHeight: scrollContainer.scrollHeight,
          }),
        );
      }

      update();
      scrollContainer.addEventListener('scroll', update, { passive: true });
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
      observer?.observe(scrollContainer);
      return () => {
        scrollContainer.removeEventListener('scroll', update);
        observer?.disconnect();
      };
    },
    [scrollRef, idsKey],
  );

  return headingIds.length === 0 ? -1 : Math.max(activeIndex, 0);
}
