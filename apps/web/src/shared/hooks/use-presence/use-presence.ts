import { type RefObject, useEffectEvent, useLayoutEffect, useState } from 'react';

/**
 * 나타나고 사라지는 요소의 단계.
 * - `entering`: 나타나는 중. 들어가는 모션 클래스(`motion-*-enter`, `motion-window-open` 등)를 붙인다.
 * - `entered`: 들어가는 애니메이션이 끝났다(동작 줄이기·jsdom에서는 바로). 정지 모습으로 바꿀 때 쓴다.
 * - `exiting`: 사라지는 중. 나가는 모션 클래스를 붙이고, 애니메이션이 끝날 때까지 화면에 남는다.
 * - `exited`: 사라졌다. `keepMounted`가 아니면 빠지고, `keepMounted`면 남은 채 `isHidden`이 된다.
 */
export type PresenceStatus = 'entering' | 'entered' | 'exiting' | 'exited';

/** usePresence 설정 */
export type PresenceOptions = {
  /**
   * 사라진 뒤에도 요소를 빼지 않고 `isHidden`으로 알린다. 쓰는 곳이 `hidden`·`inert`로 숨긴다.
   * 최소화한 창처럼 안의 상태와 스크롤을 지켜야 할 때 쓴다.
   */
  keepMounted?: boolean;
  /**
   * 요소 자신뿐 아니라 안쪽 요소의 애니메이션도 기다린다.
   * 모션 클래스가 안쪽을 움직일 때만 켠다(글자 목록 `motion-start-jump-list-*`의 `[data-jump-list]`).
   */
  subtree?: boolean;
  /** 사라지는 애니메이션이 끝났을 때 부른다. 저장소에서 지운 항목을 화면에서도 놓을 때 쓴다 */
  onExitComplete?: () => void;
};

/** usePresence 결과 */
export type Presence = {
  /** 요소를 그려야 하는지. false면 쓰는 곳이 요소를 빼고 그린다 */
  isMounted: boolean;
  /** 사라진 뒤 남겨 둔 상태인지(`keepMounted`일 때만 그려진 채 true가 된다) */
  isHidden: boolean;
  /** 지금 단계. 들어가는·나가는 모션 클래스를 고를 때 쓴다 */
  status: PresenceStatus;
  /** 요소에 펼쳐 넣는 data 속성. Base UI 팝업과 같은 `data-starting-style`·`data-ending-style`이다 */
  presenceProps: { 'data-starting-style'?: ''; 'data-ending-style'?: '' };
};

/**
 * 나타나고 사라지는 요소를 모션 클래스의 애니메이션이 끝날 때까지 화면에 붙든다. Base UI 팝업이 하는 일을 Base UI 밖의
 * 요소(창, Start·검색 패널, 글자 목록, 재부팅 화면)에 똑같이 해 주는 앱 공통 훅이다.
 *
 * - `isOpen`이 true가 되면 `entering`이 되고, 첫 프레임까지만 `data-starting-style`을 단다. 들어가는 애니메이션이 끝나면
 *   `entered`가 된다.
 * - `isOpen`이 false가 되면 바로 `exiting`이 되고 `data-ending-style`을 단다. 커밋한 뒤 `ref` 요소의 애니메이션
 *   (`subtree`면 안쪽까지)이 모두 끝나면 `exited`가 되고 `onExitComplete`를 부른다.
 * - 무한 반복 애니메이션(ProgressRing)과 CSS transition(`motion-control-state` 같은 hover 전환)은 기다리지 않는다.
 *   끝나지 않거나 단계와 상관없는 움직임이라서다.
 * - 기다릴 애니메이션이 없거나 `getAnimations`가 없으면(동작 줄이기, jsdom) 칠하기 전에 바로 다음 단계로 간다.
 * - 클래스가 바뀌어 애니메이션이 취소되면(`finished` 거부) 끝난 것으로 본다. 기다리는 중에 `isOpen`이 다시 바뀌면 그 결과는 버린다.
 * - 처음부터 `isOpen`이면 처음 그릴 때도 `entering`부터 시작한다.
 *
 * 모션 클래스는 Tailwind 변형(`data-ending-style:motion-…`)이 아니라 `status`로 골라 글자 그대로 붙인다.
 * 동작 줄이기 규칙이 글자 그대로의 클래스 선택자에만 걸리기 때문이다. 정지 모습(숨김, `inert`)은 쓰는 곳이 갖는다.
 *
 * 요소는 쓰는 곳이 만든 ref로 받는다. 훅이 ref를 돌려주면 React Compiler가 결과 전체를 ref로 보아 렌더 중에 쓸 수 없고,
 * 창처럼 같은 요소를 따로 재야 하는 곳이 ref를 하나로 쓸 수 있기 때문이다. ref를 달지 않으면 기다리지 않고 바로 넘어간다.
 * @example
 * const panelRef = useRef<HTMLDivElement>(null);
 * const presence = usePresence(panelRef, isOpen);
 * if (!presence.isMounted) return null;
 * return (
 *   <div
 *     ref={panelRef}
 *     {...presence.presenceProps}
 *     className={presence.status === 'exiting' ? 'motion-panel-exit' : 'motion-panel-enter'}
 *   />
 * );
 * @codocs [[피그마 연동:모션 클래스]]
 * @param ref 애니메이션을 기다릴 요소. 쓰는 곳이 그 요소에 단다
 * @param isOpen 보여야 하는지(저장소의 값). false가 되면 저장소에서는 이미 지워졌어도 화면에서만 잠시 남긴다
 * @param options 설정
 * @returns 그릴지 여부, 지금 단계, 요소에 달 data 속성
 */
export function usePresence(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: PresenceOptions = {},
): Presence {
  const shouldKeepMounted = options.keepMounted ?? false;
  const shouldIncludeSubtree = options.subtree ?? false;
  const { onExitComplete } = options;
  const [status, setStatus] = useState<PresenceStatus>(isOpen ? 'entering' : 'exited');
  const [isStarting, setIsStarting] = useState(isOpen);
  const [isPreviousOpen, setIsPreviousOpen] = useState(isOpen);

  // isOpen이 바뀐 그 렌더에서 바로 단계를 바꾼다. 효과에서 바꾸면 한 번은 이전 클래스로 칠해지기 때문이다.
  if (isOpen !== isPreviousOpen) {
    setIsPreviousOpen(isOpen);
    setStatus(isOpen ? 'entering' : 'exiting');
    setIsStarting(isOpen);
  }

  const handleExitComplete = useEffectEvent(
    /** 쓰는 곳의 onExitComplete를 부른다. 효과가 늘 최신 콜백을 부르게 한다. */
    () => {
      onExitComplete?.();
    },
  );

  useLayoutEffect(
    /** 들어가거나 나가는 단계면 커밋한 뒤 애니메이션이 끝나기를 기다려 다음 단계로 간다. 칠하기 전에 돌아 깜빡임이 없다. */
    () => {
      if (status !== 'entering' && status !== 'exiting') {
        return undefined;
      }
      // 정리 함수가 돌면(다음 단계로 바뀜, 언마운트) 기다리던 결과를 버린다. 단계마다 새로 만드는 세대 표시다.
      let isStale = false;
      const frame = status === 'entering' ? requestAnimationFrame(clearStartingStyle) : undefined;

      /** 첫 프레임이 지나면 data-starting-style을 뗀다. */
      function clearStartingStyle(): void {
        setIsStarting(false);
      }

      /** 기다리던 애니메이션이 모두 끝나면 다음 단계로 간다. */
      function finish(): void {
        if (isStale) {
          return;
        }
        if (status === 'entering') {
          setStatus('entered');
          return;
        }
        setStatus('exited');
        handleExitComplete();
      }

      const animations = getAwaitedAnimations(ref.current, shouldIncludeSubtree);
      if (animations.length === 0) {
        finish();
      } else {
        // 취소된 애니메이션의 finished는 거부되므로 allSettled로 끝난 것으로 본다.
        Promise.allSettled(animations.map(getFinished)).then(finish, finish);
      }

      return () => {
        isStale = true;
        if (frame !== undefined) {
          cancelAnimationFrame(frame);
        }
      };
    },
    [ref, status, shouldIncludeSubtree],
  );

  const presenceProps: Presence['presenceProps'] = {};
  if (status === 'entering' && isStarting) {
    presenceProps['data-starting-style'] = '';
  }
  if (status === 'exiting') {
    presenceProps['data-ending-style'] = '';
  }

  return {
    isMounted: shouldKeepMounted || status !== 'exited',
    isHidden: status === 'exited',
    status,
    presenceProps,
  };
}

/**
 * 단계가 끝나기를 기다릴 애니메이션을 고른다. 무한 반복과 CSS transition은 뺀다.
 * @param element 애니메이션을 볼 요소. 없으면(ref를 달지 않음) 기다리지 않는다
 * @param shouldIncludeSubtree 안쪽 요소의 애니메이션도 볼지
 * @returns 기다릴 애니메이션
 */
function getAwaitedAnimations(
  element: HTMLElement | null,
  shouldIncludeSubtree: boolean,
): Animation[] {
  if (element === null || typeof element.getAnimations !== 'function') {
    return [];
  }
  return element.getAnimations({ subtree: shouldIncludeSubtree }).filter(isAwaitedAnimation);
}

/**
 * 단계가 끝나기를 기다려야 하는 애니메이션인지 본다.
 * @param animation 요소의 애니메이션
 * @returns 무한 반복도 CSS transition도 아니면 true
 */
function isAwaitedAnimation(animation: Animation): boolean {
  if (typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) {
    return false;
  }
  return animation.effect?.getTiming().iterations !== Infinity;
}

/**
 * 애니메이션이 끝나는 약속을 꺼낸다.
 * @param animation 기다릴 애니메이션
 * @returns 끝나면 풀리고 취소되면 거부되는 약속
 */
function getFinished(animation: Animation): Promise<Animation> {
  return animation.finished;
}
