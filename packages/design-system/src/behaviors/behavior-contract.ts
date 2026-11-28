import type { AllHTMLAttributes, Ref } from 'react';

import type { BehaviorSpec } from './behavior-spec';

// 동작의 종류가 지키는 계약의 구현 쪽(React)이다. 종류는 입력을 받아 상태 이름과 레이어 역할별 속성을 돌려준다.
// 생성기가 만든 합친 컴포넌트는 훅을 부르고, 역할마다 돌려받은 속성을 그 역할의 레이어 요소에 펼친다.
// 스킨은 이 속성이 붙인 상태 표시(CSS의 말, aria, data)로만 동작과 만난다.

/**
 * 역할 하나의 요소에 펼치는 속성. 이벤트, aria, data, ref, 표준 속성(`disabled`, `type` 등)이다.
 * 생김새(`className`, `style`)는 스킨이 갖고 동작은 돌려주지 않는다.
 * @codocs [[디자인 시스템:세 겹]]
 * @codocs [[디자인 시스템:상태]]
 */
export type RoleProps = Omit<AllHTMLAttributes<HTMLElement>, 'className' | 'style'> & {
  ref?: Ref<HTMLElement>;
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
};

/**
 * 동작이 돌려주는 것.
 * - states: 지금 켠 상태 낱말(낱말 표의 word). 의사 클래스처럼 브라우저가 켜는 낱말은 넣지 않는다
 * - roles: 역할 이름 → 그 역할의 요소에 펼칠 속성. 종류의 모든 역할을 담는다
 * @codocs [[디자인 시스템:동작의 종류]]
 */
export type BehaviorResult<Role extends string> = {
  states: readonly string[];
  roles: Readonly<Record<Role, RoleProps>>;
};

/** 종류 규칙의 역할 이름 */
export type RoleOf<Spec extends BehaviorSpec> = Spec['roles'][number]['role'];

/** 종류 규칙이 입력으로 여는 코드 이름(낱말과 축의 codeName) */
export type CodeNameOf<Spec extends BehaviorSpec> = Exclude<
  Spec['stateWords'][number]['codeName'] | Spec['axes'][number]['codeName'],
  null
>;

/** 종류 규칙의 코드 이름마다 켜고 끄는 입력. 훅의 입력은 이것을 모두 받아야 한다 */
export type BehaviorFlags<Spec extends BehaviorSpec> = { [Name in CodeNameOf<Spec>]?: boolean };

/**
 * 동작의 종류 하나(등록부의 항목).
 * - spec: 종류의 규칙(`behavior-specs.ts`에 올린 것과 같은 값)
 * - useBehavior: 입력을 받아 상태와 역할별 속성을 돌려주는 훅. 입력은 코드 이름의 켜고 끄는 입력과 사건 입력(`EventSpec.inputName`)을 받는다
 * @codocs [[디자인 시스템:동작의 종류]]
 */
export type Behavior<Spec extends BehaviorSpec, Input extends BehaviorFlags<Spec>> = {
  spec: Spec;
  useBehavior: (input: Input) => BehaviorResult<RoleOf<Spec>>;
};

/** 등록부의 구현 쪽 꼴. 규칙 쪽(`behaviorSpecs`)과 키가 같고, 항목마다 그 규칙을 갖는다 */
export type BehaviorRegistry<Specs extends Readonly<Record<string, BehaviorSpec>>> = {
  readonly [Name in keyof Specs]: Behavior<Specs[Name], never>;
};
