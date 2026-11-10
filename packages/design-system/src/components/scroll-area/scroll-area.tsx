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
import { needsScrollFocus } from './scroll-focus';
import { draggedScrollTop, scrollThumb, type Thumb } from './scroll-thumb';

export type ScrollAreaMaterial = ScrollbarMaterial;

/** 막대를 끌기 시작한 포인터의 세로 위치(clientY)와 그때의 스크롤 위치다 */
type Drag = { startY: number; startScrollTop: number };

type ScrollAreaProps = ComponentProps<'div'> & {
  material?: ScrollAreaMaterial;
  contentClassName?: string;
};

/**
 * 넘치는 내용을 스크롤하게 하는 영역(피그마 ScrollArea)이다. 자기 모양(바탕, 테두리, 반경)은 없다.
 * 브라우저 스크롤바는 숨기고, 내용이 넘칠 때만 세로 Scrollbar를 오른쪽에 겹쳐 그린다. 넘치면 가는 막대가 늘 보이고,
 * 마우스를 스크롤바 칸에 올렸을 때만 펼친다. 막대를 끄는 동안은 포인터가 칸 밖이어도 펼친 채다.
 * 크기는 쓰는 곳이 className으로 정한다(피그마 원본은 400×200). 내용은 children(피그마 Content 슬롯)이다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 기반:겹쳐 놓기]]
 * @param props 컴포넌트 속성
 * @param props.material 피그마 Material. 안쪽 Scrollbar의 재질로, 스크롤바 칸에 마우스를 올려 펼친 바탕이다
 * @param props.contentClassName 스크롤되는 요소 안쪽에 줄 클래스. 내용 둘레의 여백을 토큰 클래스로 준다.
 *   루트 className에 여백을 주면 여백 위에서 휠이 듣지 않고 막대 비율이 어긋나므로 여백은 여기에 준다.
 * @param props.className 덧붙이거나 덮어쓸 클래스
 * @param props.children 스크롤할 내용(피그마 Content 슬롯)
 */
export function ScrollArea({
  material = 'acrylic',
  contentClassName,
  className,
  children,
  ...divProps
}: ScrollAreaProps): JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb>();
  const [isFocusable, setIsFocusable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [drag, setDrag] = useState<Drag>();

  /** 지금 스크롤 위치와 크기로 막대를 다시 잰다. */
  function handleMeasure(): void {
    const viewport = viewportRef.current;
    const scrollbar = scrollbarRef.current;
    if (!viewport || !scrollbar) return;
    setThumb(scrollThumb(viewport, scrollbar.clientHeight));
  }

  /** 마우스가 스크롤바 칸에 들어오면 펼친다. */
  function handleScrollbarPointerEnter(): void {
    setIsHovered(true);
  }

  /** 마우스가 스크롤바 칸을 벗어나면 접는다. 끄는 중이면 끌기가 끝날 때까지 펼친 채다. */
  function handleScrollbarPointerLeave(): void {
    setIsHovered(false);
  }

  /**
   * 막대 위에서 누르면 끌기를 시작한다. 끄는 동안의 움직임은 창 전체에서 받아 칸 밖으로 나가도 이어진다.
   * @param event 포인터 이벤트
   */
  function handleScrollbarPointerDown(event: PointerEvent<HTMLDivElement>): void {
    const viewport = viewportRef.current;
    if (!viewport || !thumb || event.button !== 0) return;
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    if (y < thumb.offset || y > thumb.offset + thumb.length) return;
    // 끄는 동안 글자가 선택되지 않게 한다.
    event.preventDefault();
    setDrag({ startY: event.clientY, startScrollTop: viewport.scrollTop });
  }

  useEffect(
    /**
     * 끄는 동안 창 전체의 포인터 움직임으로 스크롤하고, 놓으면 끌기를 끝낸다.
     * @returns 구독을 끊는 함수
     */
    () => {
      if (!drag) return;
      const start = drag;
      /**
       * 포인터가 움직인 거리만큼 스크롤한다.
       * @param event 포인터 이벤트
       */
      function handleMove(event: globalThis.PointerEvent): void {
        const viewport = viewportRef.current;
        const scrollbar = scrollbarRef.current;
        if (!viewport || !scrollbar) return;
        viewport.scrollTop = draggedScrollTop(
          {
            clientHeight: viewport.clientHeight,
            scrollHeight: viewport.scrollHeight,
            scrollTop: start.startScrollTop,
          },
          scrollbar.clientHeight,
          event.clientY - start.startY,
        );
      }
      /** 포인터를 놓으면 끌기를 끝낸다. */
      function handleEnd(): void {
        setDrag(undefined);
      }
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleEnd);
      window.addEventListener('pointercancel', handleEnd);
      return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleEnd);
        window.removeEventListener('pointercancel', handleEnd);
      };
    },
    [drag],
  );

  useEffect(
    /**
     * 처음 그린 뒤 막대와 포커스 여부를 재고, 크기가 바뀔 때마다 다시 재도록 구독한다.
     * @returns 구독을 끊는 함수
     */
    () => {
      const viewport = viewportRef.current;
      const scrollbar = scrollbarRef.current;
      if (!viewport || !scrollbar) return;
      /** 영역, 스크롤바, 내용의 크기가 바뀌면 다시 잰다. */
      function measure(): void {
        if (!viewport || !scrollbar) return;
        const next = scrollThumb(viewport, scrollbar.clientHeight);
        setThumb(next);
        setIsFocusable(needsScrollFocus(viewport, next !== undefined));
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
      className={cn(
        'relative isolate flex flex-col overflow-hidden',
        // 스크롤 영역 자신이 키보드 포커스를 받으면 루트에 포커스 고리를 그린다. 루트가 내용을 자르므로 영역에 그리면 보이지 않는다.
        'has-[>[data-scrollbar-hidden]:focus-visible]:outline-stroke-width-focus-outer has-[>[data-scrollbar-hidden]:focus-visible]:outline-color-black-89 has-[>[data-scrollbar-hidden]:focus-visible]:outline-solid',
        className,
      )}
    >
      {/* 브라우저 스크롤바는 자리를 차지하지 않게 숨긴다. 겹쳐 그린 Scrollbar가 대신한다.
          넘치는데 안에 포커스할 요소가 없으면 키보드로 스크롤하도록 영역이 포커스를 받는다(axe scrollable-region-focusable). */}
      <div
        ref={viewportRef}
        onScroll={handleMeasure}
        tabIndex={isFocusable ? 0 : undefined}
        className={cn('flex flex-flex-fill flex-col overflow-y-auto', contentClassName)}
        data-scrollbar-hidden
      >
        {/* 피그마 Content 슬롯(세로 배치, 내용 맞춤)이다. 넘쳐도 내용이 눌리지 않게 줄지 않는 틀로 감싼다. */}
        <div className="flex flex-flex-fill shrink-shrink-none flex-col">{children}</div>
      </div>
      {/* 내용이 넘치지 않으면 스크롤바를 숨긴다. 길이를 재야 하므로 자리는 남긴다(visibility).
          숨긴 스크롤바는 포인터를 받지 않아 펼쳐지지 않는다. */}
      <Scrollbar
        ref={scrollbarRef}
        aria-hidden
        isExpanded={isHovered || drag !== undefined}
        material={material}
        thumbOffset={thumb?.offset}
        thumbLength={thumb?.length}
        onPointerEnter={handleScrollbarPointerEnter}
        onPointerLeave={handleScrollbarPointerLeave}
        onPointerDown={handleScrollbarPointerDown}
        // 오른쪽 거리 spacing/2, 위아래 거리 spacing/4로 세로 양쪽을 늘여 겹친다.
        className={cn(
          'absolute top-spacing-xs right-spacing-2xs bottom-spacing-xs',
          !thumb && 'invisible',
        )}
      />
    </div>
  );
}
