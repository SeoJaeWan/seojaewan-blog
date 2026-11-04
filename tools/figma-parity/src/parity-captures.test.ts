import { describe, expect, it } from 'vitest';

import { capturePath, capturePublishPlan } from './parity-captures.ts';
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
    kind: target.startsWith('patterns/') ? 'pattern' : 'component',
    name: target,
    variant,
    figma: null,
    previous: null,
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

  it('PR의 조립 캡처는 병합 때 쓴 것과 같은 경로에서 이전 코드 그림을 읽는다', () => {
    const plan = capturePublishPlan([row('patterns/menu/folder', 'state=hover')]);
    expect(capturePath('patterns/menu/folder', 'state=hover')).toBe([...plan.files.keys()][0]);
    expect(capturePath('patterns/menu/folder', 'state=hover')).toBe(
      'patterns/menu/folder/state=hover.png',
    );
  });
});
