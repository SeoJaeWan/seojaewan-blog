import { describe, expect, it } from 'vitest';

import { capturePublishPlan } from './parity-captures.ts';
import type { CaptureRow } from './results.ts';

/**
 * 테스트용 캡처 표 줄을 만든다.
 * @param target 대상
 * @param variant 변형
 * @param change 바꿀 필드
 * @returns 캡처 표 줄
 */
function row(target: string, variant: string, change: Partial<CaptureRow> = {}): CaptureRow {
  return {
    target,
    name: target,
    variant,
    figma: null,
    code: `${target}/${variant}/code.png`,
    diff: null,
    error: null,
    ...change,
  };
}

// @codocs [[피그마 연동:CI]]
describe('parity-captures 브랜치', () => {
  it('컴포넌트는 <컴포넌트>/<변형>.png, 조립은 patterns/<영역>/<이름>/<변형>.png에 코드 캡처를 쓴다', () => {
    const plan = capturePublishPlan([
      row('button', 'state=rest'),
      row('patterns/menu/folder', 'default'),
    ]);
    expect([...plan.files]).toEqual([
      ['button/state=rest.png', 'button/state=rest/code.png'],
      ['patterns/menu/folder/default.png', 'patterns/menu/folder/default/code.png'],
    ]);
    expect(plan.replaced).toEqual(['button', 'patterns/menu/folder']);
  });

  it('캡처하지 못한 변형이 있으면 그 대상 폴더를 비우지 않고 캡처한 파일만 덮어쓴다', () => {
    const plan = capturePublishPlan([
      row('menu-item', 'state=rest'),
      row('menu-item', 'state=hover', { code: null, error: '보이지 않는다' }),
    ]);
    expect([...plan.files.keys()]).toEqual(['menu-item/state=rest.png']);
    expect(plan.replaced).toEqual([]);
  });
});
