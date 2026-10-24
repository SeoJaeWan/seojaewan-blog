import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

export type ProgressRingTone = 'accent' | 'on-dark';

export type ProgressRingSize = '16' | '32' | '64';

type ProgressRingProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Tone. accent는 밝은 바탕 위 강조색 호, on-dark는 재부팅 화면처럼 어두운 바탕 위 흰 호다 */
  tone?: ProgressRingTone;
  /** 피그마 Size. 링의 한 변 길이(px)다 */
  size?: ProgressRingSize;
};

// Windows가 정한 크기라 고정 크기 변수(size/16·32·64)로 둔다. 호 자산도 같은 크기로 그린다.
const sizeClassNames = {
  '16': 'size-16',
  '32': 'size-32',
  '64': 'size-64',
} as const satisfies Record<ProgressRingSize, string>;

// 호 자산(progress-ring/Arc)은 한 가지 색이라 쓰는 곳의 색 변수로 칠한다.
const toneClassNames = {
  accent: 'text-accent-fill-default',
  'on-dark': 'rounded-control text-boot-screen-foreground',
} as const satisfies Record<ProgressRingTone, string>;

/**
 * 끝을 모르는 진행 상태를 보여 주는 링(피그마 ProgressRing)을 그린다. 글을 불러올 때와 재부팅 화면에 쓴다.
 * 접근성 이름은 쓰는 곳이 `aria-label`로 붙인다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function ProgressRing(props: ProgressRingProps): JSX.Element {
  const { tone = 'accent', size = '16', className, ...divProps } = props;
  return (
    <div
      role="progressbar"
      {...divProps}
      className={cn(
        'flex shrink-0 items-center justify-center',
        sizeClassNames[size],
        toneClassNames[tone],
        className,
      )}
    >
      <Asset name="shapes/progress-ring-arc.svg" className={sizeClassNames[size]} />
    </div>
  );
}
