import { useEffect, useRef } from "react";

/**
 * Search가 열리는 시점에 실제 input을 스크롤 없이 focus하고 연결할 ref를 반환한다.
 * 열린 상태의 재렌더에서는 focus를 다시 가져오지 않는다.
 */
export const useTaskbarSearchInputFocus = (open: boolean) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) inputRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = open;
  }, [open]);
  return inputRef;
};
