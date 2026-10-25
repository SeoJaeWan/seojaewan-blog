import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { ProgressRing } from '../progress-ring/progress-ring';

export type BootScreenDevice = 'desktop' | 'mobile';

type BootScreenProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Device. 화면 크기와 로고 크기, 로고와 링 사이 간격을 고른다 */
  device?: BootScreenDevice;
};

// 기기가 정한 화면 크기(size/1280×720, size/390×844)다. 로고와 링 사이 간격은 크기 변수(size/160, size/120)라
// 간격 클래스가 없으므로, 같은 높이의 빈 자리로 둔다.
const deviceClassNames = {
  desktop: { screen: 'w-1280 h-720', logo: 'size-120', gap: 'h-160' },
  mobile: { screen: 'w-390 h-844', logo: 'size-96', gap: 'h-120' },
} as const satisfies Record<BootScreenDevice, { screen: string; logo: string; gap: string }>;

/**
 * 재부팅할 때 보이는 검은 화면(피그마 BootScreen)을 그린다. Windows 로고와 진행 링이 가운데에 쌓인다.
 * 접근성 이름은 쓰는 곳이 `aria-label`로 붙인다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function BootScreen(props: BootScreenProps): JSX.Element {
  const { device = 'desktop', className, ...divProps } = props;
  const classNames = deviceClassNames[device];
  return (
    <div
      {...divProps}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center bg-boot-screen-background',
        classNames.screen,
        className,
      )}
    >
      <Asset name="illustrations/logo-windows.svg" className={cn('shrink-0', classNames.logo)} />
      <div aria-hidden className={cn('w-full shrink-0', classNames.gap)} />
      <ProgressRing tone="on-dark" size="32" aria-label="다시 시작하는 중" />
    </div>
  );
}
