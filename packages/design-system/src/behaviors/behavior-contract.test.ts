import type { MouseEventHandler } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { STATE_AXIS } from '../figma-export/component-schema';
import { buttonSchema } from '../figma-export/figma-export.fixture';
import type {
  Behavior,
  BehaviorFlags,
  BehaviorRegistry,
  BehaviorResult,
  RoleOf,
} from './behavior-contract';
import { type BehaviorSpec, findStateWord, stateWordsOf } from './behavior-spec';
import { behaviorSpecOf, behaviorSpecs } from './behavior-specs';

// 계약이 실제로 쓸 수 있는지 `button` 하나를 맞춰 본다. 실제 종류는 아니고 등록부에 올리지 않는다.
const buttonSpec = {
  name: 'button',
  roles: [
    {
      role: 'root',
      selector: { kind: 'root' },
      isRequired: true,
      isMultiple: false,
      tag: 'button',
    },
    {
      role: 'label',
      selector: { kind: 'text-property' },
      isRequired: false,
      isMultiple: false,
      tag: null,
    },
  ],
  stateWords: [
    {
      word: 'Disabled',
      condition: { kind: 'pseudo-class', name: 'disabled' },
      target: 'root',
      codeName: 'isDisabled',
    },
    {
      word: 'Focused',
      condition: { kind: 'pseudo-class', name: 'focus-visible' },
      target: 'root',
      codeName: null,
    },
    {
      word: 'Pressed',
      condition: { kind: 'pseudo-class', name: 'active' },
      target: 'root',
      codeName: null,
    },
    {
      word: 'Hover',
      condition: { kind: 'pseudo-class', name: 'hover' },
      target: 'root',
      codeName: null,
    },
    { word: 'Rest', condition: null, target: 'root', codeName: null },
  ],
  axes: [],
  event: { inputName: 'onClick', nestedSuffix: '' },
  runtimeValues: [],
} as const satisfies BehaviorSpec;

type ButtonInput = BehaviorFlags<typeof buttonSpec> & {
  onClick?: MouseEventHandler<HTMLElement>;
};

const buttonBehavior: Behavior<typeof buttonSpec, ButtonInput> = {
  spec: buttonSpec,
  useBehavior: ({ isDisabled = false, onClick: handleClick }) => ({
    states: isDisabled ? ['Disabled'] : [],
    roles: {
      root: { type: 'button', disabled: isDisabled, onClick: handleClick },
      label: {},
    },
  }),
};

// @codocs [[디자인 시스템:동작의 종류]]
// @codocs [[디자인 시스템:상태]]
describe('동작 계약', () => {
  it('규칙에서 역할 이름과 입력 이름이 나온다', () => {
    expectTypeOf<RoleOf<typeof buttonSpec>>().toEqualTypeOf<'root' | 'label'>();
    expectTypeOf<BehaviorFlags<typeof buttonSpec>>().toEqualTypeOf<{ isDisabled?: boolean }>();
    expectTypeOf(buttonBehavior.useBehavior).returns.toEqualTypeOf<
      BehaviorResult<'root' | 'label'>
    >();
  });

  it('구현 쪽 등록부는 규칙 쪽과 같은 이름의 종류를 받는다', () => {
    const registry = { button: buttonBehavior } satisfies BehaviorRegistry<{
      button: typeof buttonSpec;
    }>;
    expect(registry.button.spec.name).toBe('button');
    expect(buttonBehavior.useBehavior({ isDisabled: true }).roles.root.disabled).toBe(true);
  });

  it('Button 스키마의 상태 낱말은 모두 낱말 표에 있다', () => {
    const states = buttonSchema.variants.map((variant) => variant.values[STATE_AXIS] ?? '');
    for (const word of states.flatMap(stateWordsOf)) {
      expect(findStateWord(buttonSpec, word.toLowerCase()), word).toBeDefined();
    }
    expect(stateWordsOf('Selected unfocused  current')).toEqual([
      'Selected',
      'unfocused',
      'current',
    ]);
  });

  it('Button 스키마의 모든 변형에 label 역할(글자 속성에 묶인 글자)이 있다', () => {
    for (const variant of buttonSchema.variants) {
      expect(
        variant.root.children.some(
          (layer) => layer.kind === 'text' && layer.propertyRefs.characters !== undefined,
        ),
      ).toBe(true);
    }
  });

  it('등록부에 없는 종류는 찾지 못한다', () => {
    expect(Object.keys(behaviorSpecs)).toEqual([]);
    expect(behaviorSpecOf('button')).toBeUndefined();
    expect(behaviorSpecOf('constructor')).toBeUndefined();
  });
});
