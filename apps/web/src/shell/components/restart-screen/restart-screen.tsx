import { type JSX, useEffect, useRef, useState } from 'react';

import { BootScreen } from '@seojaewan/design-system';

import { usePresence } from '@/shared/hooks/use-presence/use-presence';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';

// 재부팅 화면을 보여 주는 시간 토큰(`motion/delay/boot-screen`)이다. 동작 줄이기에서도 이 시간은 그대로 둔다.
const BOOT_SCREEN_DELAY = '--motion-delay-boot-screen';

/**
 * 다시 시작할 때 화면 전체를 덮는 재부팅 화면(BootScreen)을 그리고 다시 시작 단계를 넘긴다.
 * 1. `covering`이 되면 `motion-boot-screen-enter`로 페이드 인한다.
 * 2. 다 덮으면(`entered`, 동작 줄이기에서는 바로) 저장소를 처음 상태로 돌리고 세대를 올린다(`showing`).
 * 3. `--motion-delay-boot-screen` 동안 보여 준다. 그동안 안의 ProgressRing이 돈다.
 * 4. `motion-boot-screen-exit`로 페이드 아웃하고, 끝나면 빼고 `idle`로 돌아간다.
 * 로고 크기와 간격은 화면 구간에 따라 CSS가 고른다(`device="auto"`). 서버가 화면 크기를 몰라도 첫 HTML부터 기기에 맞는 모습이다.
 * @codocs [[다시 시작:순서]]
 * @codocs [[피그마 연동:모션 클래스]]
 *
 * 사이트를 처음 불러올 때(`booting`)는 같은 화면이 서버 HTML에서부터 나타나는 움직임 없이 덮고 있다. 수화와 기기 판단이 끝나
 * shell이 알리면 정해진 시간을 기다리지 않고 바로 `motion-boot-screen-exit`로 걷힌다. 이때는 안전장치 틀
 * (`data-boot-screen-fallback`, `globals.css`)로 한 번 더 감싸, 스크립트가 돌지 않거나 실패해도 CSS만으로 몇 초 뒤 걷힌다.
 * 틀은 이번에 걷힐 때까지 그대로 두고, 그 뒤의 다시 시작에는 쓰지 않는다.
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @returns 재부팅 화면, 다시 시작하거나 처음 불러오는 중이 아니면 null
 */
export function RestartScreen(): JSX.Element | null {
  const phase = useRestartStore((state) => state.phase);
  const finishCovering = useRestartStore((state) => state.finishCovering);
  const finishShowing = useRestartStore((state) => state.finishShowing);
  const finishRevealing = useRestartStore((state) => state.finishRevealing);
  const [isPageLoad, setIsPageLoad] = useState(phase === 'booting');
  const screenRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(
    screenRef,
    phase === 'booting' || phase === 'covering' || phase === 'showing',
    { onExitComplete: handleExitComplete },
  );
  const isCovered = presence.status === 'entered';

  /** 재부팅 화면이 다 사라지면 안전장치 틀을 거두고 다시 시작을 끝낸다. */
  function handleExitComplete(): void {
    setIsPageLoad(false);
    finishRevealing();
  }

  useEffect(
    /** 화면을 다 덮으면 상태를 지운다. */
    () => {
      if (phase === 'covering' && isCovered) {
        finishCovering();
      }
    },
    [phase, isCovered, finishCovering],
  );

  useEffect(
    /** 상태를 지운 뒤 정해진 시간 동안 보여 주고 사라지게 한다. */
    () => {
      if (phase !== 'showing') {
        return undefined;
      }
      const timer = window.setTimeout(finishShowing, readCssTimeVariable(BOOT_SCREEN_DELAY));
      return () => {
        window.clearTimeout(timer);
      };
    },
    [phase, finishShowing],
  );

  if (!presence.isMounted) {
    return null;
  }
  let motionClassName = isPageLoad ? '' : 'motion-boot-screen-enter';
  if (presence.status === 'exiting') {
    motionClassName = 'motion-boot-screen-exit';
  }
  const screen = (
    <BootScreen
      ref={screenRef}
      device="auto"
      progressLabel={isPageLoad ? '시작하는 중' : '다시 시작하는 중'}
      {...presence.presenceProps}
      className={`fixed inset-spacing-none h-full w-full ${motionClassName}`}
    />
  );
  if (!isPageLoad) {
    return screen;
  }
  // 안전장치 틀은 사라지는 움직임을 늦춰 둔 채 붙인다. 지연은 `globals.css`의 `[data-boot-screen-fallback]`이 준다.
  return (
    <div data-boot-screen-fallback="" className="fixed inset-spacing-none motion-boot-screen-exit">
      {screen}
    </div>
  );
}
