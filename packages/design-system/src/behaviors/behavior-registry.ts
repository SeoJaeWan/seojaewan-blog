import type { Behavior, BehaviorRegistry } from './behavior-contract';
import type { BehaviorSpec } from './behavior-spec';
import type { behaviorSpecs } from './behavior-specs';

// 동작 등록부의 구현 쪽이다(종류 이름 → 종류의 규칙과 훅). 규칙 쪽(`behavior-specs.ts`)과 같은 이름으로 올린다.
// 생성기는 합친 컴포넌트에서 종류의 훅을 바로 import하고, 이 등록부는 놓인 자리에 따라 스킨에 다른 종류를 잇는 조립이 쓴다.

/**
 * 동작 등록부의 구현 쪽. 아직 만든 종류가 없다.
 * @codocs [[디자인 시스템:동작의 종류]]
 */
export const behaviors = {} satisfies BehaviorRegistry<typeof behaviorSpecs> &
  Readonly<Record<string, Behavior<BehaviorSpec, never>>>;
