import { Input } from '@base-ui/react/input';
import {
  type ComponentProps,
  type DOMAttributes,
  type JSX,
  type Ref,
  type RefCallback,
  useEffect,
  useRef,
} from 'react';

import { cn } from '../../cn';

/** 이름 바꾸기 입력창 요소다. 한 줄이면 input, 여러 줄(`isMultiline`)이면 textarea다. */
type RenameFieldElement = HTMLInputElement | HTMLTextAreaElement;

// 이벤트 처리기와 ref는 input·textarea 어느 쪽이든 받게 요소 타입을 넓힌다.
type RenameFieldProps = Omit<
  ComponentProps<typeof Input>,
  keyof DOMAttributes<HTMLInputElement> | 'defaultValue' | 'type' | 'ref' | 'render'
> &
  Omit<DOMAttributes<RenameFieldElement>, 'children' | 'dangerouslySetInnerHTML'> & {
    ref?: Ref<RenameFieldElement>;
    text?: string;
    isMultiline?: boolean;
  };

// 줄 바꿈 문자를 넣는 입력 종류다(Enter, Shift + Enter, 가상 키보드의 줄 바꿈 등).
const lineBreakInputTypes = new Set(['insertLineBreak', 'insertParagraph']);

/**
 * 줄 바꿈 문자를 넣는 입력을 막는다. Enter 확정 같은 키 동작은 keydown에서 그대로 받는다.
 * @param event 입력 직전 이벤트
 */
function preventLineBreak(event: Event): void {
  if (event instanceof InputEvent && lineBreakInputTypes.has(event.inputType)) {
    event.preventDefault();
  }
}

/**
 * 이름 바꾸기 입력창(피그마 RenameField)을 그린다. 바탕화면·탐색기의 이름 바꾸기 상태에 쓴다.
 * 입력·포커스·접근성은 Base UI Input이 맡는다. 접근성 이름은 `aria-label`이나 label 요소로 붙인다.
 * 마운트할 때 포커스를 주고 이름 전체를 선택한다. 피그마의 파랗게 선택된 이름은 실제 글자 선택(`::selection`)이다.
 * 너비는 글자 길이에 맞춰 늘고(`field-sizing: content`), 선은 여백 바깥에서 크기에 더해진다(31×22).
 * 한 줄(기본)은 input이고 최대 너비 없이 옆으로 는다. 여러 줄(`isMultiline`)은 textarea이고, 부모 너비 안에서 글자 단위로
 * 줄을 바꾸며 아래로 길어진다. 짧은 이름이면 글자 너비만 차지하고 높이는 제한하지 않는다. 줄 바꿈 문자는 입력되지 않는다.
 * Enter 확정·Esc 취소 같은 동작은 쓰는 곳이 `onKeyDown` 등으로 붙인다.
 * @codocs [[컴포넌트 목록:기본 컨트롤]]
 * @codocs [[항목과 폴더:폴더 이름]]
 * @param props 컴포넌트 속성
 * @param props.text 피그마 TEXT 속성 text. 입력창의 처음 값이다(`value`를 주면 쓰지 않는다)
 * @param props.value 입력창 값(제어). 주면 text를 처음 값으로 쓰지 않는다
 * @param props.isMultiline 여러 줄 입력창(textarea)으로 그린다. 아이콘 보기(FileItem)가 쓴다
 * @param props.ref 입력창(input이나 textarea)에 걸 ref
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function RenameField({
  text = '이름',
  value,
  isMultiline = false,
  ref,
  className,
  ...fieldProps
}: RenameFieldProps): JSX.Element {
  const fieldRef = useRef<RenameFieldElement>(null);

  useEffect(
    /** 처음 그린 뒤 포커스를 주고 이름 전체를 선택한다. */
    () => {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    },
    [],
  );

  useEffect(
    /**
     * 여러 줄 입력창에 줄 바꿈 문자가 들어가지 않게 한다. React의 onBeforeInput은 입력 종류(inputType)를 주지 않아 직접 듣는다.
     * @returns 듣기를 멈추는 함수
     */
    () => {
      const field = fieldRef.current;
      if (!isMultiline || field === null) return undefined;
      field.addEventListener('beforeinput', preventLineBreak);
      return () => {
        field.removeEventListener('beforeinput', preventLineBreak);
      };
    },
    [isMultiline],
  );

  /**
   * 안쪽 ref와 쓰는 곳이 넘긴 ref에 입력창을 함께 건다.
   * @param node 입력창 요소
   * @returns 쓰는 곳의 콜백 ref가 돌려준 정리 함수
   */
  function handleRef(node: RenameFieldElement | null): ReturnType<RefCallback<RenameFieldElement>> {
    fieldRef.current = node;
    if (typeof ref === 'function') return ref(node);
    if (ref) ref.current = node;
    return undefined;
  }

  // 처리기는 input·textarea 모두에서 같은 모양의 이벤트로 불리므로 Base UI Input의 input용 타입으로 넘긴다.
  const inputProps = fieldProps as Omit<ComponentProps<typeof Input>, 'ref'>;
  return (
    <Input
      {...inputProps}
      ref={handleRef}
      render={isMultiline ? <textarea rows={1} /> : undefined}
      type={isMultiline ? undefined : 'text'}
      value={value}
      defaultValue={value === undefined ? text : undefined}
      className={cn(
        'block field-sizing-content border-stroke-width-default border-color-black-61 bg-color-white px-spacing-xs py-spacing-2xs',
        'type-caption text-color-black-89 outline-none',
        isMultiline ? 'max-w-full resize-none overflow-hidden break-all' : 'whitespace-nowrap',
        'selection:bg-color-blue-50 selection:text-color-white',
        className,
      )}
    />
  );
}
