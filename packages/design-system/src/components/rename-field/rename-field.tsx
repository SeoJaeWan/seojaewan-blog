import { Input } from '@base-ui/react/input';
import { type ComponentProps, type JSX, type RefCallback, useEffect, useRef } from 'react';

import { cn } from '../../cn';

type RenameFieldProps = Omit<ComponentProps<typeof Input>, 'defaultValue' | 'type'> & {
  /** 피그마 TEXT 속성 text. 입력창의 처음 값이다(`value`를 주면 쓰지 않는다) */
  text?: string;
  /** 마운트할 때 이름 전체를 선택할지. 피그마 `State`(`Selected`면 true, `Rest`면 false)에 대응한다 */
  shouldSelectOnMount?: boolean;
};

/**
 * 이름 바꾸기 입력창(피그마 RenameField)을 그린다. 바탕화면·탐색기의 이름 바꾸기 상태에 쓴다.
 * 입력·포커스·접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * 마운트할 때 포커스를 주고, `shouldSelectOnMount`(기본 true)면 이름 전체를 선택한다. 피그마의 파랗게 선택된 이름은 실제 글자 선택(`::selection`)이다.
 * 너비는 글자 길이에 맞춰 늘고(`field-sizing: content`), 선은 여백 바깥에서 크기에 더해진다(31×22).
 * Enter 확정·Esc 취소 같은 동작은 쓰는 곳이 `onKeyDown` 등으로 붙인다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @param props
 */
export function RenameField(props: RenameFieldProps): JSX.Element {
  const { text = '이름', shouldSelectOnMount = true, value, ref, className, ...inputProps } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    /** 처음 그린 뒤 포커스를 주고, 켜져 있으면 이름 전체를 선택한다. */
    () => {
      inputRef.current?.focus();
      if (shouldSelectOnMount) inputRef.current?.select();
    },
    [shouldSelectOnMount],
  );

  /**
   * 안쪽 ref와 쓰는 곳이 넘긴 ref에 input을 함께 건다.
   * @param node input 요소
   * @returns 쓰는 곳의 콜백 ref가 돌려준 정리 함수
   */
  function handleRef(node: HTMLInputElement | null): ReturnType<RefCallback<HTMLInputElement>> {
    inputRef.current = node;
    if (typeof ref === 'function') return ref(node);
    if (ref) ref.current = node;
    return undefined;
  }

  return (
    <Input
      {...inputProps}
      ref={handleRef}
      type="text"
      value={value}
      defaultValue={value === undefined ? text : undefined}
      className={cn(
        'block field-sizing-content border-default border-control-strong-stroke-default bg-control-fill-input-active px-4 py-2',
        'type-caption whitespace-nowrap text-text-fill-primary outline-none',
        'selection:bg-accent-fill-selected-text-background selection:text-text-on-accent-fill-selected-text',
        className,
      )}
    />
  );
}
