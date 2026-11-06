import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { getFrontWindowId } from '@/shared/utils/window-rules/window-rules';

/**
 * 맨 앞 창으로 포커스를 옮긴다. 창이 없으면 바탕화면(`main`)이다. 이미 창 안에 있으면 그대로 둔다.
 * 메뉴가 열려 있으면 바깥이 `inert`라 옮겨지지 않으므로, 메뉴가 닫히며 포커스를 돌려줄 때 다시 옮긴다.
 * @codocs [[접근성:포커스]]
 * @param layer 창 층 요소
 * @param id 맨 앞 창 id. 없으면 null
 * @returns 다시 옮기기를 기다리면 그것을 지우는 정리 함수
 */
export function focusFront(layer: HTMLElement, id: string | null): (() => void) | undefined {
  if (id === null) {
    layer.closest('main')?.focus();
    return undefined;
  }
  const region = layer.querySelector<HTMLElement>(`[data-window-id="${id}"]`);
  if (region === null || region.contains(document.activeElement)) {
    return undefined;
  }
  const target = region.querySelector<HTMLElement>('[data-window-focus]') ?? region;
  target.focus({ preventScroll: true });
  if (document.activeElement === target) {
    return undefined;
  }

  /** 메뉴가 포커스를 돌려주면 창으로 옮긴다. */
  function handleFocusIn(): void {
    target.focus({ preventScroll: true });
  }

  document.addEventListener('focusin', handleFocusIn, { once: true });
  return () => {
    document.removeEventListener('focusin', handleFocusIn);
  };
}

/**
 * 화면을 덮던 것(재부팅 화면)이 걷힌 뒤 맨 앞 창으로 포커스를 옮긴다. 창이 없으면 바탕화면(`main`)이다.
 * 덮는 동안 바탕화면이 `inert`라 창을 열 때 옮기지 못한 포커스를 여기서 옮긴다. 다시 시작한 뒤에는 창이 모두 닫혀 바탕화면이다.
 * @codocs [[접근성:포커스]]
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @param main 바탕화면(`main`) 요소. 그 안의 창 층을 찾는다
 */
export function focusFrontWindow(main: HTMLElement): void {
  const layer = main.querySelector<HTMLElement>('[data-layer="windows"]');
  if (layer === null) {
    main.focus();
    return;
  }
  focusFront(layer, getFrontWindowId(useWindowStore.getState()));
}
