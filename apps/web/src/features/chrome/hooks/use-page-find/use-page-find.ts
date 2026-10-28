import { type RefObject, useEffect, useId, useState } from 'react';

import { findTextRanges, stepMatchIndex } from '@/features/chrome/utils/page-find/page-find';

/** 찾기 결과와 이동 */
export type PageFind = {
  /** 지금 위치(1부터). 일치가 없으면 0 */
  current: number;
  /** 일치하는 곳의 개수 */
  total: number;
  /** 다음 일치로 간다. 끝이면 처음으로 돌아간다 */
  next: () => void;
  /** 이전 일치로 간다. 처음이면 끝으로 돌아간다 */
  previous: () => void;
};

// 강조 이름이다. `globals.css`의 `::highlight()`가 `chrome/find-highlight*` 토큰으로 칠한다.
const HIGHLIGHT_NAME = 'chrome-find';
const CURRENT_HIGHLIGHT_NAME = 'chrome-find-current';

/** 찾기 하나(Chrome 창 하나)가 칠하는 곳 */
type PaintedMatches = { all: readonly Range[]; current: Range | undefined };

// 창마다 칠하는 곳이다. 강조 이름은 문서에 하나라, 여러 Chrome 창의 찾기를 모아 한 번에 칠한다.
const paintedByFinder = new Map<string, PaintedMatches>();

/**
 * 페이지 본문에서 찾는 글자를 찾아 강조하고 이동한다(실제 Chrome의 찾기 막대).
 * 일치하는 곳을 모두 노란색(`chrome/find-highlight`), 지금 위치를 주황색(`chrome/find-highlight-current`)으로 칠하고,
 * 지금 위치가 보이게 스크롤한다. 칠하기는 DOM을 바꾸지 않는 CSS Custom Highlight API로 한다(React가 그린 글자를 건드리지 않는다).
 * 찾는 글자가 바뀌면 처음 일치부터 다시 찾고, 본문이 바뀌면(본문을 받아 그림, 토글을 펼침) 다시 찾는다.
 * 찾는 글자가 비면(막대를 닫으면) 강조를 지운다.
 * @codocs [[Chrome:페이지에서 찾기]]
 * @param rootRef 찾을 영역(지금 탭의 페이지 본문)
 * @param query 찾는 글자. 비면 찾지 않는다
 * @returns 찾기 결과와 이동
 */
export function usePageFind(rootRef: RefObject<HTMLElement | null>, query: string): PageFind {
  const finderId = useId();
  const [ranges, setRanges] = useState<readonly Range[]>([]);
  const [position, setPosition] = useState({ query, index: 0 });
  const index = position.query === query ? Math.min(position.index, ranges.length - 1) : 0;
  const total = ranges.length;
  const currentRange = ranges[index];

  useEffect(
    /** 찾는 글자로 본문을 찾고, 본문이 바뀌면 다시 찾는다. */
    () => {
      const root = rootRef.current;
      if (root === null || query === '') {
        setRanges([]);
        return undefined;
      }
      /** 지금 본문에서 다시 찾는다. */
      function find(): void {
        if (root !== null) {
          setRanges(findTextRanges(root, query));
        }
      }
      find();
      const observer = new MutationObserver(find);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      return () => {
        observer.disconnect();
      };
    },
    [rootRef, query],
  );

  useEffect(
    /** 일치하는 곳과 지금 위치를 칠한다. 찾기를 닫거나 창이 사라지면 지운다. */
    () => {
      paintedByFinder.set(finderId, { all: ranges, current: currentRange });
      paintHighlights();
      return () => {
        paintedByFinder.delete(finderId);
        paintHighlights();
      };
    },
    [finderId, ranges, currentRange],
  );

  useEffect(
    /** 지금 위치가 보이게 스크롤한다. */
    () => {
      if (currentRange !== undefined && rootRef.current !== null) {
        scrollRangeIntoView(currentRange, rootRef.current);
      }
    },
    [rootRef, currentRange],
  );

  /**
   * 지금 위치를 옮긴다.
   * @param direction 다음은 1, 이전은 -1
   */
  function step(direction: 1 | -1): void {
    setPosition({ query, index: stepMatchIndex(Math.max(index, 0), total, direction) });
  }

  return {
    current: total === 0 ? 0 : index + 1,
    total,
    next: () => {
      step(1);
    },
    previous: () => {
      step(-1);
    },
  };
}

/**
 * 모든 찾기가 칠하는 곳을 문서의 강조 목록에 넣는다. CSS Custom Highlight API가 없는 환경(jsdom 등)에서는 칠하지 않는다.
 */
function paintHighlights(): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) {
    return;
  }
  const painted = [...paintedByFinder.values()];
  const others = painted.flatMap(({ all, current }) => all.filter((range) => range !== current));
  const currents = painted.flatMap(({ current }) => (current === undefined ? [] : [current]));
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...others));
  CSS.highlights.set(CURRENT_HIGHLIGHT_NAME, new Highlight(...currents));
}

/**
 * 일치한 곳이 보이도록 그곳을 담은 스크롤 상자를 스크롤한다. 보이지 않으면 상자 가운데에 오게 한다.
 * 창 틀처럼 영역 밖의 상자는 스크롤하지 않는다.
 * @param range 일치한 곳
 * @param root 찾는 영역
 */
function scrollRangeIntoView(range: Range, root: HTMLElement): void {
  if (typeof range.getBoundingClientRect !== 'function') {
    return;
  }
  const box = findScrollBox(range.startContainer.parentElement, root);
  if (box === null) {
    return;
  }
  const rect = range.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  if (rect.top >= boxRect.top && rect.bottom <= boxRect.bottom) {
    return;
  }
  box.scrollTop += rect.top - boxRect.top - (boxRect.height - rect.height) / 2;
}

/**
 * 요소를 담은 가장 가까운 세로 스크롤 상자를 영역 안에서 찾는다.
 * @param element 시작 요소
 * @param root 찾는 영역
 * @returns 스크롤 상자. 없으면 null
 */
function findScrollBox(element: HTMLElement | null, root: HTMLElement): HTMLElement | null {
  for (let current = element; current !== null; current = current.parentElement) {
    const { overflowY } = getComputedStyle(current);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    if (current === root) {
      return null;
    }
  }
  return null;
}
