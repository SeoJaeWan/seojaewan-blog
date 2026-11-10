import { Input } from '@base-ui/react/input';
import {
  type ComponentProps,
  type JSX,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '../../cn';
import { BreadcrumbChevron } from '../breadcrumb-chevron/breadcrumb-chevron';
import { IconButton } from '../icon-button/icon-button';

type BreadcrumbEditFieldProps = Omit<ComponentProps<typeof Input>, 'className' | 'type' | 'ref'>;

type BreadcrumbProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
  locationIcon: ReactNode;
  isEditing?: boolean;
  editFieldProps?: BreadcrumbEditFieldProps;
  onClear?: () => void;
  separatorLabel?: string;
  isSeparatorOpen?: boolean;
  renderSeparator?: (separator: ReactElement) => ReactNode;
};

/**
 * 현재 위치 경로를 보여 주는 줄(피그마 Breadcrumb)을 그린다. 탐색기 주소 줄에 쓴다.
 * 위치 아이콘, 꺾쇠 버튼(BreadcrumbChevron), 경로 칸(children)이다. 너비는 갖지 않고 쓰는 곳이 정한다.
 * 맨 앞 꺾쇠가 여는 메뉴는 쓰는 곳이 `renderSeparator`로 꺾쇠를 메뉴 트리거로 감싸 붙인다.
 * 마디마다의 꺾쇠는 경로 칸(BreadcrumbItem)의 같은 이름 속성으로 붙이고, 마지막 칸 뒤 꺾쇠도 그 칸의 `hasSeparator`로 쓰는 곳이 정한다.
 * 편집 중(피그마 `State=Editing`)에는 위치 아이콘·꺾쇠·경로 칸 대신 경로 글자 입력칸을 그리고, 아래에 강조색 선을 긋는다.
 * 입력이 있을 때만 오른쪽에 지우기 버튼(IconButton Subtle)을 보인다. 누르면 입력을 비우고 포커스는 입력칸에 남는다.
 * 입력칸은 그려질 때 포커스를 받고 경로 전체를 선택한다. 피그마의 파랗게 선택된 경로는 실제 글자 선택(`::selection`)이다.
 * 편집으로 바꾸기·Enter로 이동하기·Esc로 돌아가기 같은 동작은 쓰는 곳이 `isEditing`과 `editFieldProps`로 붙인다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[파일 탐색기:주소창 편집]]
 * @param props 컴포넌트 속성
 * @param props.children 피그마 Items 슬롯. 경로 칸(BreadcrumbItem)을 채운다. 편집 중에는 그리지 않는다
 * @param props.locationIcon 피그마 `Location icon` 인스턴스 교체 속성(`locationIcon`). 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다. 편집 중에는 그리지 않는다
 * @param props.isEditing 피그마 State=Editing. 경로 칸 대신 경로 글자 입력칸을 그린다
 * @param props.editFieldProps 편집 입력칸(Base UI Input)에 넘길 값·동작·접근성 속성(`value`, `defaultValue`, `onValueChange`,
 *   `onKeyDown`, `onBlur`, `aria-label` 등). 생김새는 바꾸지 않는다. `isEditing`일 때만 쓴다
 * @param props.onClear 지우기 버튼을 눌렀을 때 부른다. `value`로 값을 정하는 쓰는 곳은 여기서 값을 비운다.
 *   `defaultValue`만 준 입력칸은 컴포넌트가 스스로 비운다
 * @param props.separatorLabel 맨 앞 꺾쇠 버튼(피그마 `separator`)의 접근성 이름(BreadcrumbChevron의 `label`)
 * @param props.isSeparatorOpen 맨 앞 꺾쇠 버튼이 연 메뉴가 열려 있는지(BreadcrumbChevron의 `isOpen`). 열린 동안 아래 꺾쇠(⌄)다
 * @param props.renderSeparator 맨 앞 꺾쇠 버튼을 감싸 그린다. 꺾쇠와 그 꺾쇠가 여는 메뉴를 묶는 메뉴 트리거가 꺾쇠 요소를 받아 쓴다.
 *   주지 않으면 꺾쇠를 그대로 그린다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Breadcrumb({
  children,
  locationIcon,
  isEditing = false,
  editFieldProps,
  onClear: handleClear,
  separatorLabel = '최상위 항목',
  isSeparatorOpen = false,
  renderSeparator,
  className,
  ...divProps
}: BreadcrumbProps): JSX.Element {
  const separator = <BreadcrumbChevron label={separatorLabel} isOpen={isSeparatorOpen} />;
  return (
    <div
      {...divProps}
      className={cn(
        'flex h-size-control-height items-center gap-spacing-xs rounded-radius-control border-stroke-width-default border-color-black-6',
        // 편집 중에는 입력칸이 넘치는 글자를 스스로 밀어 보이고, 아래 강조색 선이 테두리 위에 놓이도록 자르지 않는다.
        // 오른쪽 여백은 지우기 버튼 자리라 좁다(피그마 `State=Editing`의 padding).
        isEditing
          ? 'relative bg-color-white pr-spacing-xs pl-spacing-sm'
          : 'overflow-clip bg-color-white-70 px-spacing-sm',
        className,
      )}
    >
      {isEditing ? (
        <>
          <BreadcrumbEditField {...editFieldProps} onClear={handleClear} />
          {/* 피그마 `bottom border`다. 테두리 아래쪽에 겹쳐 그린다. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-spacing-none -bottom-spacing-hairline border-b-stroke-width-focus-outer border-color-blue-59"
          />
        </>
      ) : (
        <>
          <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
            {locationIcon}
          </span>
          {renderSeparator === undefined ? separator : renderSeparator(separator)}
          {/* 피그마 Items 슬롯의 배치(가로, 간격 spacing/xs)다 */}
          <div className="flex items-center gap-spacing-xs">{children}</div>
        </>
      )}
    </div>
  );
}

type BreadcrumbEditFieldInnerProps = BreadcrumbEditFieldProps & {
  onClear?: () => void;
};

/**
 * 편집 중인 Breadcrumb의 경로 입력칸(피그마 `selection` 안 `path`)과 지우기 버튼(피그마 `clear`)을 그린다.
 * 그려질 때 포커스를 주고 경로 전체를 선택한다. 입력이 비면 지우기 버튼을 그리지 않는다.
 * @codocs [[파일 탐색기:주소창 편집]]
 * @param props Base UI Input 속성과 지우기 동작
 * @param props.onClear 지우기 버튼을 눌렀을 때 부른다
 * @returns 경로 입력칸과 지우기 버튼
 */
function BreadcrumbEditField({
  onClear: handleClear,
  ...inputProps
}: BreadcrumbEditFieldInnerProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const { value, defaultValue, onValueChange: handleValueChange } = inputProps;
  const isControlled = value !== undefined;
  // `defaultValue`만 받은 입력칸의 지금 값이다. 지우기 버튼을 보일지 정하는 데 쓴다.
  const [uncontrolledValue, setUncontrolledValue] = useState(() => String(defaultValue ?? ''));
  const hasValue = (isControlled ? String(value) : uncontrolledValue) !== '';

  useEffect(
    /** 처음 그린 뒤 포커스를 주고 경로 전체를 선택한다. */
    () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    [],
  );

  /**
   * 입력이 바뀌면 값을 기억하고 쓰는 곳에 알린다.
   * @param nextValue 바뀐 입력
   * @param eventDetails Base UI가 넘기는 바뀐 까닭
   */
  function handleInputValueChange(
    nextValue: string,
    eventDetails: Parameters<NonNullable<BreadcrumbEditFieldProps['onValueChange']>>[1],
  ): void {
    setUncontrolledValue(nextValue);
    handleValueChange?.(nextValue, eventDetails);
  }

  /**
   * 지우기 버튼을 누르기 시작할 때 포커스가 버튼으로 옮겨 가지 않게 막는다. 입력칸이 포커스를 잃으면 쓰는 곳이 편집을 끝내기 때문이다.
   * @param event 누르기 이벤트
   */
  function handleClearMouseDown(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
  }

  /** 지우기 버튼: 입력을 비우고 포커스를 입력칸에 둔다. */
  function handleClearClick(): void {
    const input = inputRef.current;
    if (!isControlled && input !== null) {
      input.value = '';
      setUncontrolledValue('');
    }
    handleClear?.();
    input?.focus();
  }

  return (
    <>
      <Input
        {...inputProps}
        onValueChange={handleInputValueChange}
        ref={inputRef}
        type="text"
        className={cn(
          'min-w-size-none flex-flex-fill bg-color-white-0 type-body text-color-black-89 outline-none',
          'selection:bg-color-blue-9 selection:text-color-black-89',
        )}
      />
      {hasValue ? (
        <IconButton
          variant="subtle"
          label="지우기"
          icon="icons/ic_fluent_dismiss_20_regular.svg"
          // 마우스로만 쓰는 버튼이다. Tab으로 옮겨 가면 입력칸이 포커스를 잃어 편집이 끝난다.
          tabIndex={-1}
          className="shrink-shrink-none"
          onMouseDown={handleClearMouseDown}
          onClick={handleClearClick}
        />
      ) : null}
    </>
  );
}
