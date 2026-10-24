import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type RenameFieldProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 TEXT 속성 text. 선택된 채 보이는 이름이다 */
  text?: string;
};

/**
 * 이름 바꾸기 입력 상자(피그마 RenameField)를 그린다. FileItem과 FileRow의 이름 바꾸기 상태에 쓴다.
 * 너비와 높이는 글자에 맞춘다(HUG). 선은 피그마 자동 레이아웃처럼 여백 바깥에서 크기에 더해진다(31×22).
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function RenameField(props: RenameFieldProps): JSX.Element {
  const { text = '이름', className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'relative flex items-center border-default border-control-strong-stroke-default bg-control-fill-input-active px-4 py-2',
        className,
      )}
    >
      <span className="bg-accent-fill-selected-text-background type-caption whitespace-nowrap text-text-on-accent-fill-selected-text">
        {text}
      </span>
    </div>
  );
}
