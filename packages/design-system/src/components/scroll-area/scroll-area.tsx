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
import { scrollThumb, type Thumb } from './scroll-thumb';

export type ScrollAreaMaterial = ScrollbarMaterial;

type ScrollAreaProps = ComponentProps<'div'> & {
  /** 피그마 Material. 안쪽 Scrollbar의 재질로, 마우스를 올려 펼친 스크롤바 바탕이다 */
  material?: ScrollAreaMaterial;
  /**
   * 스크롤되는 요소 안쪽에 줄 클래스. 내용 둘레의 여백을 토큰 클래스로 준다.
   * 루트 className에 여백을 주면 여백 위에서 휠이 듣지 않고 막대 비율이 어긋나므로 여백은 여기에 준다.
   */
  contentClassName?: string;
};

/**
 * 넘치는 내용을 스크롤하게 하는 영역(피그마 ScrollArea)이다. 자기 모양(바탕, 테두리, 반경)은 없다.
 * 브라우저 스크롤바는 숨기고, 내용이 넘칠 때만 세로 Scrollbar를 오른쪽에 겹쳐 그린다. 마우스를 올리면 펼친다(State=Hover).
 * 크기는 쓰는 곳이 className으로 정한다(피그마 원본은 400×200). 내용은 children(피그마 Content 슬롯)이다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param props
 */
export function ScrollArea(props: ScrollAreaProps): JSX.Element {
  const {
    material = 'acrylic',
    contentClassName,
    className,
    children,
    onPointerEnter,
    onPointerLeave,
    ...divProps
  } = props;
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb>();
  const [isFocusable, setIsFocusable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  /** 지금 스크롤 위치와 크기로 막대를 다시 잰다. */
  function handleMeasure(): void {
    const viewport = viewportRef.current;
    const scrollbar = scrollbarRef.current;
    if (!viewport || !scrollbar) return;
    setThumb(scrollThumb(viewport, scrollbar.clientHeight));
  }

  /**
   * 마우스가 들어오면 스크롤바를 펼친다.
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
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={cn(
        'relative isolate flex flex-col overflow-hidden',
        // 스크롤 영역 자신이 키보드 포커스를 받으면 루트에 포커스 고리를 그린다. 루트가 내용을 자르므로 영역에 그리면 보이지 않는다.
        'has-[>[data-scrollbar-hidden]:focus-visible]:outline-stroke-width-focus-outer has-[>[data-scrollbar-hidden]:focus-visible]:outline-focus-stroke-outer has-[>[data-scrollbar-hidden]:focus-visible]:outline-solid',
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
      {/* 내용이 넘치지 않으면 스크롤바를 숨긴다. 길이를 재야 하므로 자리는 남긴다(visibility). */}
      <Scrollbar
        ref={scrollbarRef}
        aria-hidden
        state={isHovered ? 'expanded' : 'rest'}
        material={material}
        thumbOffset={thumb?.offset}
        thumbLength={thumb?.length}
        // 오른쪽 거리 spacing/2, 위아래 거리 spacing/4로 세로 양쪽을 늘여 겹친다.
        className={cn(
          'absolute top-spacing-xs right-spacing-2xs bottom-spacing-xs',
          !thumb && 'invisible',
        )}
      />
    </div>
  );
}
