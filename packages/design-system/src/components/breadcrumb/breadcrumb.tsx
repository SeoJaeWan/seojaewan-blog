import { Input } from '@base-ui/react/input';
import { type ComponentProps, type JSX, type ReactNode, useEffect, useRef } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BreadcrumbProps = Omit<ComponentProps<'div'>, 'children'> & {
  children?: ReactNode;
  locationIcon: ReactNode;
  isEditing?: boolean;
  editFieldProps?: Omit<ComponentProps<typeof Input>, 'className' | 'type' | 'ref'>;
};

/**
 * 현재 위치 경로를 보여 주는 줄(피그마 Breadcrumb)을 그린다. 탐색기 주소 줄에 쓴다.
 * 위치 아이콘, 꺾쇠, 경로 칸(children)이다. 너비는 갖지 않고 쓰는 곳이 정한다.
 * 편집 중(피그마 `State=Editing`)에는 꺾쇠와 경로 칸 대신 경로 글자 입력칸을 그리고, 아래에 강조색 선을 긋는다.
 * 입력칸은 그려질 때 포커스를 받고 경로 전체를 선택한다. 피그마의 파랗게 선택된 경로는 실제 글자 선택(`::selection`)이다.
 * 편집으로 바꾸기·Enter로 이동하기·Esc로 돌아가기 같은 동작은 쓰는 곳이 `isEditing`과 `editFieldProps`로 붙인다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[파일 탐색기:주소창 편집]]
 * @param props 컴포넌트 속성
 * @param props.children 피그마 Items 슬롯. 경로 칸(BreadcrumbItem)을 채운다. 편집 중에는 그리지 않는다
 * @param props.locationIcon 피그마 `Location icon` 인스턴스 교체 속성(`locationIcon`). 경로 앞 위치 아이콘이다. 쓰는 곳마다 다르므로 꼭 넘긴다
 * @param props.isEditing 피그마 State=Editing. 경로 칸 대신 경로 글자 입력칸을 그린다
 * @param props.editFieldProps 편집 입력칸(Base UI Input)에 넘길 값·동작·접근성 속성(`value`, `defaultValue`, `onValueChange`,
 *   `onKeyDown`, `onBlur`, `aria-label` 등). 생김새는 바꾸지 않는다. `isEditing`일 때만 쓴다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Breadcrumb({
  children,
  locationIcon,
  isEditing = false,
  editFieldProps,
  className,
  ...divProps
}: BreadcrumbProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex h-size-control-height items-center gap-spacing-xs rounded-radius-control border-stroke-width-default border-color-black-6 px-spacing-sm',
        // 편집 중에는 입력칸이 넘치는 글자를 스스로 밀어 보이고, 아래 강조색 선이 테두리 위에 놓이도록 자르지 않는다.
        isEditing ? 'relative bg-color-white' : 'overflow-clip bg-color-white-70',
        className,
      )}
    >
      <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain">
        {locationIcon}
      </span>
      {isEditing ? (
        <>
          <BreadcrumbEditField {...editFieldProps} />
          {/* 피그마 `bottom border`다. 테두리 아래쪽에 겹쳐 그린다. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-spacing-none -bottom-spacing-hairline border-b-stroke-width-focus-outer border-color-blue-59"
          />
        </>
      ) : (
        <>
          <Asset
            name="icons/ic_fluent_chevron_right_16_regular.svg"
            className="size-size-icon-sm shrink-shrink-none text-color-black-61"
          />
          {/* 피그마 Items 슬롯의 배치(가로, 간격 spacing/xs)다 */}
          <div className="flex items-center gap-spacing-xs">{children}</div>
        </>
      )}
    </div>
  );
}

type BreadcrumbEditFieldProps = Omit<ComponentProps<typeof Input>, 'className' | 'type' | 'ref'>;

/**
 * 편집 중인 Breadcrumb의 경로 입력칸(피그마 `selection` 안 `path`)을 그린다.
 * 그려질 때 포커스를 주고 경로 전체를 선택한다.
 * @param props Base UI Input 속성
 * @returns 경로 입력칸
 */
function BreadcrumbEditField({ ...inputProps }: BreadcrumbEditFieldProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    /** 처음 그린 뒤 포커스를 주고 경로 전체를 선택한다. */
    () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    [],
  );

  return (
    <Input
      {...inputProps}
      ref={inputRef}
      type="text"
      className={cn(
        'min-w-size-none flex-flex-fill bg-color-white-0 type-caption text-color-black-89 outline-none',
        'selection:bg-color-blue-9 selection:text-color-black-89',
      )}
    />
  );
}
