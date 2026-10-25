import { type JSX, type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '../components/button/button';

type MotionPreviewProps = {
  /** 재생할 모션 클래스 이름(`motion-progress-ring`). 모션 스토리 제목 `Motion/<이름>`의 이름과 같다 */
  motionClass: string;
  /** 실행 중 값 CSS 변수와 견본의 대표값([[디자인 기반:모션]] 표의 "실행 중 값" 열). 예: `{ '--motion-target-x': '120px' }` */
  runtimeValues?: Readonly<Record<string, string>>;
  /** 모션 클래스를 받아 견본과 같은 컴포넌트를 그린다. 클래스는 움직일 요소에 붙인다 */
  children: (motionClassName: string) => ReactNode;
};

// 느리게 보기에서 쓰는 재생 속도다. 키프레임 모양을 피그마 견본과 나란히 보기 쉽게 4배 느리게 한다.
const SLOW_PLAYBACK_RATE = 0.25;
const NORMAL_PLAYBACK_RATE = 1;

/**
 * 모션 스토리(`Motion/<이름>`)에서 모션 클래스를 걸어 재생하고, 다시 재생·느리게 보기 버튼을 둔다.
 * 실행 중 값은 CSS 변수로 넣는다. 느리게 보기는 재생 속도(playbackRate)만 바꿔, 모션 시간 검사가 읽는
 * 시간·이징·지연·반복 횟수는 그대로다.
 * @codocs [[피그마 연동:모션]]
 * @param props
 */
export function MotionPreview(props: MotionPreviewProps): JSX.Element {
  const { motionClass, runtimeValues, children } = props;
  const stageRef = useRef<HTMLDivElement>(null);
  const [playCount, setPlayCount] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  useLayoutEffect(() => applyRuntimeValues(stageRef.current, runtimeValues ?? {}), [runtimeValues]);

  useLayoutEffect(() => {
    applyPlaybackRate(stageRef.current, isSlow ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE);
  }, [isSlow, playCount]);

  /**
   * 견본을 다시 그려 애니메이션을 처음부터 재생한다.
   */
  function handleReplayClick(): void {
    setPlayCount((count) => count + 1);
  }

  /**
   * 느리게 보기를 켜거나 끈다.
   */
  function handleSlowClick(): void {
    setIsSlow((isOn) => !isOn);
  }

  return (
    <div className="flex flex-col items-center gap-16">
      <div ref={stageRef}>
        <div key={playCount}>{children(motionClass)}</div>
      </div>
      <div className="flex gap-8">
        <Button label="다시 재생" onClick={handleReplayClick} />
        <Button
          label="느리게 보기"
          variant={isSlow ? 'accent' : 'standard'}
          aria-pressed={isSlow}
          onClick={handleSlowClick}
        />
      </div>
    </div>
  );
}

/**
 * 실행 중 값 CSS 변수를 요소에 넣는다.
 * @param stage 견본을 감싼 요소
 * @param values CSS 변수 이름 → 값
 * @returns 넣은 변수를 지우는 함수
 */
function applyRuntimeValues(
  stage: HTMLElement | null,
  values: Readonly<Record<string, string>>,
): () => void {
  const entries = Object.entries(values);
  for (const [name, value] of entries) {
    stage?.style.setProperty(name, value);
  }
  return () => {
    for (const [name] of entries) {
      stage?.style.removeProperty(name);
    }
  };
}

/**
 * 요소 안에서 도는 애니메이션의 재생 속도를 바꾼다. getAnimations가 없는 환경(jsdom)에서는 아무것도 하지 않는다.
 * @param stage 견본을 감싼 요소
 * @param rate 재생 속도
 */
function applyPlaybackRate(stage: HTMLElement | null, rate: number): void {
  if (stage === null || !('getAnimations' in stage)) {
    return;
  }
  for (const animation of stage.getAnimations({ subtree: true })) {
    animation.playbackRate = rate;
  }
}
