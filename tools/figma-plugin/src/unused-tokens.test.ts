import { describe, expect, it } from 'vitest';

import { unusedNotices, type UsageInput } from './unused-tokens';

const input: UsageInput = {
  variables: [
    { id: 'gray', name: 'color/gray/f9f9f9', scopes: ['ALL_FILLS'], aliasIds: [] },
    { id: 'layer', name: 'layer-fill/default', scopes: ['ALL_FILLS'], aliasIds: ['gray'] },
    { id: 'focus', name: 'focus-stroke/inner', scopes: ['STROKE_COLOR'], aliasIds: [] },
    { id: 'red', name: 'color/red/c42b1c', scopes: ['ALL_FILLS'], aliasIds: [] },
    { id: 'old', name: 'old-fill/default', scopes: ['ALL_FILLS'], aliasIds: ['red'] },
    { id: 'motion', name: 'motion/duration/fast', scopes: [], aliasIds: [] },
    { id: 'blur', name: 'blur/acrylic', scopes: ['EFFECT_FLOAT'], aliasIds: [] },
  ],
  styles: [
    {
      id: 's1',
      name: 'Material/Fallback/Acrylic Default',
      kind: 'paint',
      consumerCount: 3,
      variableIds: ['layer'],
    },
    { id: 's2', name: 'Focus/Ring', kind: 'effect', consumerCount: 0, variableIds: ['blur'] },
  ],
  nodeVariableIds: new Set(),
  nodeStyleIds: new Set(),
};

// @codocs [[피그마 연동:구조 검사]]
describe('쓰는 곳이 없는 변수·스타일 알림(막지 않음)', () => {
  it('쓰는 곳이 없는 스타일과 변수를 알리고, 별칭으로 이어진 변수는 쓰는 것으로 본다', () => {
    expect(unusedNotices(input)).toEqual([
      '효과 스타일 Focus/Ring: 쓰는 곳이 없다',
      '변수 blur/acrylic: 쓰는 곳이 없다',
      '변수 color/red/c42b1c: 쓰는 곳이 없다',
      '변수 focus-stroke/inner: 쓰는 곳이 없다',
      '변수 old-fill/default: 쓰는 곳이 없다',
    ]);
  });

  it('노드에 직접 연결된 변수와 그 별칭 대상은 알리지 않는다', () => {
    const notices = unusedNotices({ ...input, nodeVariableIds: new Set(['old', 'focus']) });
    expect(notices).not.toContain('변수 old-fill/default: 쓰는 곳이 없다');
    expect(notices).not.toContain('변수 color/red/c42b1c: 쓰는 곳이 없다');
    expect(notices).not.toContain('변수 focus-stroke/inner: 쓰는 곳이 없다');
  });

  it('키프레임 이징으로만 쓰이는 변수는 알리지 않는다', () => {
    const withEasing: UsageInput = {
      ...input,
      variables: [
        ...input.variables,
        { id: 'ease', name: 'motion/easing/standard', scopes: ['ALL_SCOPES'], aliasIds: [] },
      ],
    };
    expect(unusedNotices(withEasing)).toContain('변수 motion/easing/standard: 쓰는 곳이 없다');
    const notices = unusedNotices({ ...withEasing, nodeVariableIds: new Set(['ease']) });
    expect(notices).not.toContain('변수 motion/easing/standard: 쓰는 곳이 없다');
  });

  it('코드에서만 쓰는 변수(범위 없음)는 알리지 않는다', () => {
    expect(unusedNotices(input).some((notice) => notice.includes('motion'))).toBe(false);
  });

  it('글자 일부 구간에만 입힌 스타일은 쓰는 것으로 보고, 그 스타일의 변수도 쓰는 것으로 본다', () => {
    const notices = unusedNotices({ ...input, nodeStyleIds: new Set(['s2']) });
    expect(notices).not.toContain('효과 스타일 Focus/Ring: 쓰는 곳이 없다');
    expect(notices).not.toContain('변수 blur/acrylic: 쓰는 곳이 없다');
  });
});
