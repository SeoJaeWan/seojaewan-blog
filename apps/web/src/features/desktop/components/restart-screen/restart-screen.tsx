import { type JSX, useEffect, useRef } from 'react';

import { BootScreen } from '@seojaewan/design-system';

import { useWorkspaceStore } from '@/features/desktop/stores/workspace-store/workspace-store';
import type { Device } from '@/shared/hooks/use-device/use-device';
import { usePresence } from '@/shared/hooks/use-presence/use-presence';
import { readCssTimeVariable } from '@/shared/rules/motion-time/motion-time';

// 재부팅 화면을 보여 주는 시간 토큰(`motion/delay/boot-screen`)이다. 동작 줄이기에서도 이 시간은 그대로 둔다.
const BOOT_SCREEN_DELAY = '--motion-delay-boot-screen';

type RestartScreenProps = {
  /** 화면 방식. 재부팅 화면의 로고 크기와 간격을 고른다 */
  device: Device;
};

/**
 * 다시 시작할 때 화면 전체를 덮는 재부팅 화면(BootScreen)을 그리고 다시 시작 단계를 넘긴다.
 * 1. `covering`이 되면 `motion-boot-screen-enter`로 페이드 인한다.
 * 2. 다 덮으면(`entered`, 동작 줄이기에서는 바로) 저장소를 처음 상태로 돌리고 세대를 올린다(`showing`).
 * 3. `--motion-delay-boot-screen` 동안 보여 준다. 그동안 안의 ProgressRing이 돈다.
 * 4. `motion-boot-screen-exit`로 페이드 아웃하고, 끝나면 빼고 `idle`로 돌아간다.
 * @codocs [[작업 공간:다시 시작]]
 * @codocs [[디자인 기반:모션 클래스]]
 * @param props
 * @returns 재부팅 화면, 다시 시작하는 중이 아니면 null
 */
export function RestartScreen(props: RestartScreenProps): JSX.Element | null {
  const { device } = props;
  const phase = useWorkspaceStore((state) => state.phase);
  const finishCovering = useWorkspaceStore((state) => state.finishCovering);
  const finishShowing = useWorkspaceStore((state) => state.finishShowing);
  const finishRevealing = useWorkspaceStore((state) => state.finishRevealing);
  const screenRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(screenRef, phase === 'covering' || phase === 'showing', {
    onExitComplete: finishRevealing,
  });
  const isCovered = presence.status === 'entered';

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
  return (
    <BootScreen
      ref={screenRef}
      device={device}
      {...presence.presenceProps}
      className={`fixed inset-0 h-full w-full ${presence.status === 'exiting' ? 'motion-boot-screen-exit' : 'motion-boot-screen-enter'}`}
    />
  );
}
