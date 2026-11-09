import type { FigureState } from '@seojaewan/design-system';
import { useState } from 'react';

/**
 * 받는 중인 이미지(숨긴 img)에 다는 속성. ref는 그릴 때 이미 받아진 이미지인지 보고, onLoad·onError는 받기가 끝났을 때 알린다
 */
export type ImageLoadProbeProps = {
  ref: (image: HTMLImageElement | null) => void;
  onLoad: () => void;
  onError: () => void;
};

/**
 * 이미지 받기 상태
 * - state: 받는 중(`loading`), 다 받음(`loaded`), 받지 못함(`failed`)이다. 디자인 시스템 Figure `state`와 같다
 * - isEntering: 받는 중이었다가 다 받았는지. 이때만 나타나는 움직임(`motion-image-enter`)을 붙인다
 * - probeProps: 받는 중에 그리는 숨긴 img에 다는 속성
 */
export type ImageLoad = {
  state: FigureState;
  isEntering: boolean;
  probeProps: ImageLoadProbeProps;
};

/**
 * 글 이미지(본문 이미지, 커버, 크게 보기)의 받기 상태를 따라간다. 받는 동안은 스켈레톤을 그리고, 같은 이미지를 숨긴 img로 받아
 * 다 받으면 이미지를 서서히 나타나게 하고, 받지 못하면 회색 칸으로 남긴다.
 * 그릴 때 이미 받아진 이미지(`img.complete`)는 스켈레톤 없이 바로 보이고 나타나는 움직임도 없다. 탭을 바꾸거나 창을 다시 열 때
 * 번쩍이지 않게 하기 위해서다. 이미 받기에 실패한 이미지(받아졌는데 크기가 0)는 바로 실패다.
 * @codocs [[Notion 이미지 제공:로딩 표시]]
 * @param isEnabled 받기 상태를 따라갈지. 끄면 처음부터 다 받은 상태다(스토리처럼 이미지를 직접 넣을 때)
 * @returns 받기 상태와 숨긴 img 속성
 */
export function useImageLoad(isEnabled = true): ImageLoad {
  const [state, setState] = useState<FigureState>(isEnabled ? 'loading' : 'loaded');
  const [isEntering, setIsEntering] = useState(false);

  /**
   * 숨긴 img가 붙을 때 이미 받아진 이미지면 바로 상태를 정한다.
   * @param image 숨긴 img. 떨어질 때 null이다
   */
  function checkComplete(image: HTMLImageElement | null): void {
    if (image?.complete === true && image.currentSrc !== '') {
      setState(image.naturalWidth > 0 ? 'loaded' : 'failed');
    }
  }

  /** 다 받으면 이미지를 서서히 나타나게 한다. */
  function handleLoad(): void {
    setIsEntering(true);
    setState('loaded');
  }

  /** 받지 못하면 회색 칸으로 남긴다. */
  function handleError(): void {
    setState('failed');
  }

  return {
    state,
    isEntering,
    probeProps: { ref: checkComplete, onLoad: handleLoad, onError: handleError },
  };
}
