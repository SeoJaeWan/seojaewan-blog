// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { capturePublishPlan } from './parity-captures.ts';
import type { CaptureRow } from './parity-summary.ts';

/**
 * 테스트용 캡처 표 줄을 만든다.
 * @param component 컴포넌트
 * @param variant 결과 이름
 * @param change 바꿀 필드
 * @returns 캡처 표 줄
 */
function row(component: string, variant: string, change: Partial<CaptureRow> = {}): CaptureRow {
  return {
    component,
    variant,
    baseVariant: variant,
    isCase: false,
    figma: null,
    code: `${component}/${variant}/capture-code.png`,
    error: null,
    ...change,
  };
}

// @codocs [[피그마 일치 검사:CI 비교]]
describe('parity-captures 브랜치', () => {
  it('변형마다 코드 캡처를 <컴포넌트>/<변형>.png로 쓰고 BOOLEAN 경우는 넣지 않는다', () => {
    const plan = capturePublishPlan([
      row('button', 'state=rest'),
      row('button', 'state=rest,showIcon=true', { baseVariant: 'state=rest', isCase: true }),
    ]);
    expect([...plan.files]).toEqual([
      ['button/state=rest.png', 'button/state=rest/capture-code.png'],
    ]);
    expect(plan.replaced).toEqual(['button']);
  });

  it('캡처하지 못한 변형이 있으면 그 컴포넌트 폴더를 비우지 않고 캡처한 파일만 덮어쓴다', () => {
    const plan = capturePublishPlan([
      row('menu', 'state=rest'),
      row('menu', 'state=hover', { code: null, error: '보이지 않는다' }),
    ]);
    expect([...plan.files.keys()]).toEqual(['menu/state=rest.png']);
    expect(plan.replaced).toEqual([]);
  });
});
