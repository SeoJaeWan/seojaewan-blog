import { useEffect, useRef } from "react";

/** Sidebar pointer resize가 사용할 현재 폭과 제품 callback이다. */
export type SidebarResizeOptions = Readonly<{
  width: number;
  minimumWidth: number;
  maximumWidth: number;
  onWidthChange: (width: number) => void;
}>;

/**
 * Sidebar 경계의 primary pointer drag만 폭 변경으로 변환한다.
 *
 * keyboard separator와 double-click reset은 이 hook의 입력 경계에 존재하지 않는다.
 */
export const useSidebarResize = ({
  maximumWidth,
  minimumWidth,
  onWidthChange,
  width,
}: SidebarResizeOptions) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  return (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    cleanupRef.current?.();

    const startX = event.clientX;
    const startWidth = width;
    const ownerDocument = event.currentTarget.ownerDocument;

    const finish = (): void => {
      ownerDocument.removeEventListener("pointermove", move);
      ownerDocument.removeEventListener("pointerup", finish);
      ownerDocument.removeEventListener("pointercancel", finish);
      cleanupRef.current = null;
    };
    const move = (moveEvent: PointerEvent): void => {
      const requestedWidth = startWidth + moveEvent.clientX - startX;
      onWidthChange(Math.min(maximumWidth, Math.max(minimumWidth, requestedWidth)));
    };

    ownerDocument.addEventListener("pointermove", move);
    ownerDocument.addEventListener("pointerup", finish);
    ownerDocument.addEventListener("pointercancel", finish);
    cleanupRef.current = finish;
  };
};
