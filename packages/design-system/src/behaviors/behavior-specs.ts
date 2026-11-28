import type { BehaviorSpec } from './behavior-spec';

// 동작 등록부의 규칙 쪽이다(종류 이름 → 종류의 규칙). React 없이 읽히므로 플러그인이 빌드할 때 묶어 구조 검사에 쓰고,
// 생성 스크립트가 낱말 표와 역할을 읽는다. 구현 쪽(종류 이름 → 훅)은 `behavior-registry.ts`에 있고 같은 이름을 갖는다.
//
// 종류를 더하는 법:
// - `behaviors/<종류>/<종류>-spec.ts`에 `<종류의 낙타 표기>Spec`(`scrollAreaSpec`)을 `as const satisfies BehaviorSpec`으로 둔다(역할 이름이 리터럴 타입으로 남아야 한다).
// - 훅은 `behaviors/<종류>/use-<종류>-behavior.ts`의 `use<종류의 파스칼 표기>Behavior`(`useScrollAreaBehavior`)다. 생성기가 이 이름으로 import한다.
// - 이 파일과 `behavior-registry.ts`에 같은 이름으로 올린다. 이 파일은 규칙 파일을 `.ts` 확장자로 import한다(Node가 바로 실행한다).

/**
 * 동작 등록부의 규칙 쪽. 키는 종류 이름이다. 아직 만든 종류가 없다.
 * @codocs [[디자인 시스템:동작의 종류]]
 */
export const behaviorSpecs = {} satisfies Readonly<Record<string, BehaviorSpec>>;

/** 등록된 종류 이름 */
export type BehaviorName = keyof typeof behaviorSpecs;

/**
 * 종류 이름으로 규칙을 찾는다. `Interaction` 주석의 낱말을 그대로 넘긴다.
 * @codocs [[디자인 시스템:동작의 종류]]
 * @codocs [[디자인 시스템:구조 검사]]
 * @param name 종류 이름
 * @returns 종류의 규칙. 등록부에 없으면 undefined(구조 검사가 막는다)
 */
export function behaviorSpecOf(name: string): BehaviorSpec | undefined {
  const specs: Readonly<Record<string, BehaviorSpec>> = behaviorSpecs;
  // 플러그인 샌드박스(ES2017)에서도 돌도록 `Object.hasOwn` 대신 자기 키만 훑는다. `constructor` 같은 이름은 찾지 않는다.
  return Object.entries(specs).find(([key]) => key === name)?.[1];
}
