import { describe, expect, it } from 'vitest';

import {
  captureCommitSubject,
  capturedMainCommit,
  capturePath,
  capturePublishPlan,
  selectPreviousCapture,
} from './parity-captures.ts';
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

// @codocs [[피그마 연동:CI]]
describe('조립의 이전 코드 그림 커밋', () => {
  // main 이력: m1 ← m2 ← m3(merge-base) ← m4. parity-captures는 m1, m2, m4를 캡처했다(m3은 범위 없음).
  const mainOrder = ['aaaaaaa', 'bbbbbbb', 'ccccccc', 'ddddddd'];
  const mergeBase = 'ccccccc';
  const history = [
    { commit: 'p4', subject: captureCommitSubject('ddddddd1234') },
    { commit: 'p2', subject: captureCommitSubject('bbbbbbb1234') },
    { commit: 'p1', subject: captureCommitSubject('aaaaaaa1234') },
  ];
  /**
   * 테스트용 조상 판정: main 이력 순서로 본다.
   * @param main main 커밋 앞 7자리
   * @returns merge-base이거나 그 조상이면 true
   */
  function isMergeBaseOrAncestor(main: string): boolean {
    const index = mainOrder.indexOf(main);
    return index >= 0 && index <= mainOrder.indexOf(mergeBase);
  }

  it('병합 캡처 커밋 메시지에 main 커밋 앞 7자리를 적고 다시 읽는다', () => {
    const subject = captureCommitSubject('7be67cf0123456789');
    expect(subject).toBe('chore: update parity captures for 7be67cf');
    expect(capturedMainCommit(subject)).toBe('7be67cf');
    expect(capturedMainCommit('Initial commit')).toBeUndefined();
  });

  it('main 커밋이 merge-base이거나 그 조상인 가장 최근 캡처 커밋을 고르고, merge-base 뒤의 캡처는 건너뛴다', () => {
    expect(selectPreviousCapture(history, isMergeBaseOrAncestor)).toBe('p2');
  });

  it('merge-base를 캡처한 커밋이 있으면 그 커밋을 고른다', () => {
    expect(
      selectPreviousCapture(
        [{ commit: 'p3', subject: captureCommitSubject('ccccccc1234') }, ...history],
        isMergeBaseOrAncestor,
      ),
    ).toBe('p3');
  });

  it('형식이 다른 메시지는 건너뛰고, 맞는 커밋이 없으면 고르지 않는다', () => {
    expect(
      selectPreviousCapture(
        [
          { commit: 'x', subject: 'Merge something' },
          { commit: 'p4', subject: captureCommitSubject('ddddddd1234') },
        ],
        isMergeBaseOrAncestor,
      ),
    ).toBeUndefined();
  });
});
