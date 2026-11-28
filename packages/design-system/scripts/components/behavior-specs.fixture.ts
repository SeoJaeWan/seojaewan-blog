import type { BehaviorSpec } from '../../src/behaviors/behavior-spec.ts';
import type { BehaviorSource } from './component-model.ts';

// 생성기 시험에만 쓰는 가짜 동작 등록부다. 실제 등록부(`behavior-specs.ts`, `behavior-registry.ts`)에는 올리지 않는다.
// fixture의 Button(`button`)과 MessageBox(`dialog`)를 생성해 보려고 둔다.

export const fakeButtonSpec = {
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

export const fakeDialogSpec = {
  name: 'dialog',
  roles: [
    { role: 'root', selector: { kind: 'root' }, isRequired: true, isMultiple: false, tag: 'div' },
    {
      role: 'title',
      selector: { kind: 'layer-name', names: ['title'] },
      isRequired: true,
      isMultiple: false,
      tag: 'h2',
    },
  ],
  stateWords: [],
  axes: [],
  event: null,
  runtimeValues: [],
} as const satisfies BehaviorSpec;

const fakeSpecs: Readonly<Record<string, BehaviorSpec>> = {
  button: fakeButtonSpec,
  dialog: fakeDialogSpec,
};

/**
 * 가짜 등록부를 생성기의 꼴로 만든다. 훅은 `hookModule` 아래 `use-<종류>-behavior`에 있다고 본다.
 * @param hookModule 컴포넌트 폴더에서 가짜 훅 폴더까지의 경로
 * @returns 동작 등록부
 */
export function fakeBehaviors(hookModule: string): BehaviorSource {
  return {
    specOf: (name) => Object.entries(fakeSpecs).find(([key]) => key === name)?.[1],
    hookOf: (name) => ({
      module: `${hookModule}/use-${name}-behavior`,
      hook: `use${name.charAt(0).toUpperCase()}${name.slice(1)}Behavior`,
    }),
  };
}
