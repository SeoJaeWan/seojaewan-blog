import {
  type ComponentProps,
  type JSX,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '../../cn';
import { Scrollbar, type ScrollbarMaterial } from '../scrollbar/scrollbar';

export type ScrollAreaMaterial = ScrollbarMaterial;

type ScrollAreaProps = ComponentProps<'div'> & {
  /** 피그마 Material(안쪽 Scrollbar의 Material). 마우스를 올려 펼친 스크롤바 바탕의 재질이다 */
  material?: ScrollAreaMaterial;
};

/** 스크롤바 막대의 위치와 길이(px). 내용이 넘치지 않으면 없다 */
type Thumb = { offset: number; length: number };

// 막대가 움직이는 길이는 스크롤바 길이에서 양 끝의 안쪽 여백(spacing/2)과 화살표(size/8), 합 10을 뺀 것이다.
// 화살표는 펼쳤을 때만 그리지만, 펼칠 때 막대가 움직이지 않도록 접혔을 때도 같은 길이를 쓴다.
const TRACK_INSET = 10;

/**
 * 스크롤 위치와 영역 크기로 스크롤바 막대의 위치와 길이를 구한다.
 * 막대 길이는 보이는 비율, 위치는 스크롤한 비율을 막대가 움직이는 길이에 옮긴 것이다.
 * @codocs [[디자인 기반:겹쳐 놓기]]
 * @param viewport 스크롤하는 요소
 * @param scrollbarLength 스크롤바 길이
 * @returns 막대의 위치와 길이. 내용이 넘치지 않으면 undefined
 */
export function scrollThumb(
  viewport: Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>,
  scrollbarLength: number,
): Thumb | undefined {
  const { clientHeight, scrollHeight, scrollTop } = viewport;
  const scrollRange = scrollHeight - clientHeight;
  if (scrollRange <= 0) return undefined;
  const track = Math.max(scrollbarLength - TRACK_INSET * 2, 0);
  const length = (track * clientHeight) / scrollHeight;
  const offset = TRACK_INSET + ((track - length) * scrollTop) / scrollRange;
  return { offset, length };
}

/**
 * 스크롤바를 가진 스크롤 영역(피그마 ScrollArea)을 그린다. 내용은 children 자리(피그마 Content 슬롯)에 넣는다.
 * 브라우저 스크롤바는 숨기고, 내용이 넘칠 때만 세로 Scrollbar를 오른쪽에 겹쳐 그린다. 마우스를 올리면 펼친다(피그마 State=Hover).
 * 크기는 쓰는 곳이 정한다(피그마 원본 320×240은 미리보기 크기다).
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function ScrollArea(props: ScrollAreaProps): JSX.Element {
  const {
    material = 'acrylic',
    className,
    children,
    onPointerEnter,
    onPointerLeave,
    ...divProps
  } = props;
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb>();
  const [isHovered, setIsHovered] = useState(false);

  /** 지금 스크롤 위치와 크기로 막대를 다시 잰다. */
  function handleMeasure(): void {
    const viewport = viewportRef.current;
    const scrollbar = scrollbarRef.current;
    if (!viewport || !scrollbar) return;
    setThumb(scrollThumb(viewport, scrollbar.clientHeight));
  }

  /**
   * 마우스가 들어오면 스크롤바를 펼친다(피그마 State=Hover).
   * @param event 포인터 이벤트
   */
  function handlePointerEnter(event: PointerEvent<HTMLDivElement>): void {
    setIsHovered(true);
    onPointerEnter?.(event);
  }

  /**
   * 마우스가 나가면 스크롤바를 접는다.
   * @param event 포인터 이벤트
   */
  function handlePointerLeave(event: PointerEvent<HTMLDivElement>): void {
    setIsHovered(false);
    onPointerLeave?.(event);
  }

  useEffect(
    /**
     * 처음 그린 뒤 막대를 재고, 크기가 바뀔 때마다 다시 재도록 구독한다.
     * @returns 구독을 끊는 함수
     */
    () => {
      const viewport = viewportRef.current;
      const scrollbar = scrollbarRef.current;
      if (!viewport || !scrollbar) return;
      /** 영역, 스크롤바, 내용의 크기가 바뀌면 다시 잰다. */
      function measure(): void {
        if (viewport && scrollbar) setThumb(scrollThumb(viewport, scrollbar.clientHeight));
      }
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);
      observer.observe(scrollbar);
      for (const child of viewport.children) observer.observe(child);
      return () => {
        observer.disconnect();
      };
    },
    [],
  );

  return (
    <div
      {...divProps}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={cn(
        // 피그마 테두리는 안쪽 선이라 레이아웃에 들어가지 않는다. ::before 고리(inner-border-*)로 그린다.
        'relative isolate flex flex-col overflow-hidden rounded-control bg-layer-fill-alt',
        'inner-border-card-stroke-default inner-border-w-default',
        className,
      )}
    >
      {/* 피그마 Content 슬롯. 오른쪽 여백(spacing/24)은 스크롤바 자리다. 브라우저 스크롤바는 그 자리를 차지하지 않게 숨긴다. */}
      <div
        ref={viewportRef}
        onScroll={handleMeasure}
        className="flex flex-1 flex-col gap-8 overflow-y-auto pt-12 pr-24 pb-12 pl-12"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>
      {/* 내용이 넘치지 않으면 스크롤바를 숨긴다. 길이를 재야 하므로 자리는 남긴다(visibility). */}
      <Scrollbar
        ref={scrollbarRef}
        aria-hidden
        orientation="vertical"
        state={isHovered ? 'expanded' : 'rest'}
        material={material}
        thumbOffset={thumb?.offset}
        thumbLength={thumb?.length}
        // 피그마 절대 위치: 오른쪽 거리 spacing/2, 위아래 거리 spacing/4로 세로 양쪽 늘이기다.
        className={cn('absolute top-4 right-2 bottom-4', !thumb && 'invisible')}
      />
    </div>
  );
}
