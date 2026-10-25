import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SystemTrayProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 TEXT 속성 Time. 위 줄에 보일 시간이다 */
  time?: string;
  /** 피그마 TEXT 속성 Date. 아래 줄에 보일 날짜다 */
  date?: string;
};

/**
 * 작업 표시줄 오른쪽의 시간과 날짜 표시(피그마 SystemTray)를 그린다. 높이는 Windows가 정한 40으로 고정하고 너비는 글자에 맞춘다.
 * Rest·Hover 모양은 CSS hover로 바꾼다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function SystemTray(props: SystemTrayProps): JSX.Element {
  const { time = '시간', date = '날짜', className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex h-40 flex-col items-end justify-center rounded-control px-12 select-none',
        'type-caption text-text-fill-primary',
        'motion-control-state',
        'hover:border-default hover:border-control-stroke-default hover:bg-control-fill-default',
        className,
      )}
    >
      <span>{time}</span>
      <span>{date}</span>
    </div>
  );
}
