import { type AllHTMLAttributes, createElement, type JSX, type ReactNode, type Ref } from 'react';

// 생성한 스킨이 동작에게서 받는 자리의 꼴이다. 스킨은 동작을 import하지 않으므로, 합친 컴포넌트가 동작의 결과를
// 이 꼴로 넘긴다. 태그와 역할·사건·aria·data 속성은 동작이 정하고, 모습(className)은 스킨이 갖는다.

/**
 * 스킨의 자리 하나에 펼치는 속성. 생김새(`className`, `style`)는 스킨이 갖으므로 받지 않는다.
 * @codocs [[디자인 시스템:세 겹]]
 */
export type SkinPartProps = Omit<AllHTMLAttributes<HTMLElement>, 'className' | 'style'> & {
  ref?: Ref<HTMLElement>;
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
};

/** 자리를 그릴 HTML 태그 */
export type SkinTag = keyof HTMLElementTagNameMap;

/** 자리 하나에 동작이 주는 것. 태그를 주지 않으면 스킨의 기본 태그(`div`, 글자는 `span`)다 */
export type SkinPart = { tag?: SkinTag; props?: SkinPartProps };

/** 스킨이 여는 자리들. 키는 레이어 이름에서 만든 자리 이름이다 */
export type SkinParts<Name extends string> = Partial<Readonly<Record<Name, SkinPart>>>;

type SkinElementProps = {
  part: SkinPart | undefined;
  defaultTag: SkinTag;
  className: string;
  children?: ReactNode;
};

/**
 * 동작이 준 태그와 속성으로 스킨의 자리 하나를 그린다. 클래스는 스킨의 것을 쓴다.
 * @codocs [[디자인 시스템:세 겹]]
 * @codocs [[디자인 시스템:동작의 종류]]
 * @param props 컴포넌트 속성
 * @param props.part 동작이 준 태그와 속성
 * @param props.defaultTag 동작이 태그를 주지 않을 때의 태그
 * @param props.className 스킨이 정한 클래스
 * @param props.children 안에 그릴 것
 */
export function SkinElement({
  part,
  defaultTag,
  className,
  children,
}: SkinElementProps): JSX.Element {
  return createElement(part?.tag ?? defaultTag, { ...part?.props, className }, children);
}
