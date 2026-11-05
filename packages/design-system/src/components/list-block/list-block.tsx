import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Checkbox } from '../checkbox/checkbox';

type ListBlockCommonProps = Omit<ComponentProps<'li'>, 'children'> & {
  text: ReactNode;
  hasChildren?: boolean;
  children?: ReactNode;
};

type MarkerListBlockProps = ListBlockCommonProps & {
  variant?: 'bulleted' | 'numbered';
  marker?: string;
  isChecked?: never;
  label?: never;
};

type ToDoListBlockProps = ListBlockCommonProps & {
  variant: 'to-do';
  isChecked?: boolean;
  label: string;
  marker?: never;
};

type ListBlockProps = MarkerListBlockProps | ToDoListBlockProps;

/**
 * 글 본문의 목록 항목 하나(피그마 ListBlock)를 `li`로 그린다. 쓰는 곳이 `ul`·`ol`로 감싼다.
 * 표시 칸(24×24)과 글 사이 간격은 8이다. 글머리표는 가운데, 번호는 오른쪽에 맞춘다. 할 일은 읽기 전용 Checkbox다.
 * 하위 항목은 `children` 자리에 표시 너비 + 간격(32)만큼 들여 그린다.
 * 너비는 쓰는 곳이 정한다(피그마 원본 너비는 견본 크기다).
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[Notion 블록:모양]]
 * @param props 컴포넌트 속성
 * @param props.variant 피그마 Variant. 글머리표(`bulleted`)와 번호(`numbered`)는 표시 글자를 쓰고, 할 일(`to-do`)은 표시 글자 대신
 *   Checkbox를 쓴다
 * @param props.marker (글머리표·번호) 코드 전용. 깊이와 순서로 정한 표시(`•`, `1.` 등)를 쓰는 곳이 넣는다. 피그마에는 없고, 넘기지 않으면 변형 표시(글머리표 `•`, 번호 `1.`)를 그린다
 * @param props.isChecked (할 일) 피그마 Checked. 끝낸 할 일이면 체크하고 글자를 흐린 취소선으로 그린다
 * @param props.label (할 일) 할 일 Checkbox의 접근성 이름. 할 일 글자를 그대로 적는다
 * @param props.text 피그마 `Text` 글자. 서식이 섞인 목록 항목 글이다
 * @param props.hasChildren 피그마 Has children. 하위 항목 자리(`children`)를 들여 그릴지 정한다
 * @param props.children 피그마 `Children` 슬롯. 하위 목록과 블록을 넣는다. `hasChildren`일 때만 그린다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function ListBlock({
  variant = 'bulleted',
  marker,
  isChecked = false,
  label,
  text,
  hasChildren = false,
  children,
  className,
  ...liProps
}: ListBlockProps): JSX.Element {
  const markerText = marker ?? (variant === 'numbered' ? '1.' : '•');
  const isDone = variant === 'to-do' && isChecked;
  return (
    <li {...liProps} className={cn('flex flex-col gap-spacing-xs', className)}>
      {/* 피그마 `row` 배치 프레임 */}
      <div className="flex w-full items-start gap-spacing-sm">
        {variant === 'to-do' ? (
          <span className="flex size-size-post-block-marker shrink-shrink-none items-center justify-center">
            <Checkbox isChecked={isChecked} label={label ?? ''} />
          </span>
        ) : (
          <span
            aria-hidden
            className={cn(
              'flex size-size-post-block-marker shrink-shrink-none items-center type-body-large text-color-black-89',
              variant === 'numbered' ? 'justify-end' : 'justify-center',
            )}
          >
            {markerText}
          </span>
        )}
        <p
          className={cn(
            'min-w-size-none flex-flex-fill',
            isDone
              ? 'type-body-large-strikethrough text-color-black-61'
              : 'type-body-large text-color-black-89',
          )}
        >
          {text}
        </p>
      </div>
      {hasChildren && (
        // 피그마 `Children` 슬롯. 하위 항목은 표시 너비 + 간격(32)만큼 들여 쓴다
        <div className="flex w-full flex-col gap-spacing-xs pl-spacing-3xl">{children}</div>
      )}
    </li>
  );
}
