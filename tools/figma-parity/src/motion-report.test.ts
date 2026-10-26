import { describe, expect, it } from 'vitest';

import { type MotionResult, renderMotionComments } from './motion-report.ts';
import type { ValueRow } from './motion-values.ts';
import { COMMENT_MARKER, markerIndex } from './pr-comment.ts';

const RUN_URL = 'https://github.com/o/r/actions/runs/1';

/**
 * 테스트용 결과 표 줄을 만든다.
 * @param change 바꿀 필드
 * @returns 결과 표 줄
 */
function row(change: Partial<ValueRow> = {}): ValueRow {
  return {
    keyframe: '0% (0ms)',
    property: 'WindowFrame OPACITY → opacity',
    figma: '0',
    code: 'opacity: 0',
    status: 'same',
    note: '',
    ...change,
  };
}

/**
 * 테스트용 견본 결과를 만든다.
 * @param name 견본 이름
 * @param change 바꿀 필드
 * @returns 견본 결과
 */
function result(name: string, change: Partial<MotionResult> = {}): MotionResult {
  return {
    name,
    url: `https://www.figma.com/design/KEY?node-id=1-2`,
    rows: [row()],
    timingErrors: [],
    error: null,
    ...change,
  };
}

// @codocs [[피그마 연동:CI]]
describe('CI', () => {
  it('모션 검사 결과를 견본마다 키프레임 | 속성 | 피그마 | 코드 | 결과 표로 쓴다', () => {
    const [body = ''] = renderMotionComments([result('motion-window-open')], RUN_URL);
    expect(body.startsWith('<!-- motion-check -->')).toBe(true);
    expect(body).toContain('모션 검사: 견본 1개, 모두 같음');
    expect(body).toContain('<details><summary>✅ motion-window-open</summary>');
    expect(body).toContain('| 키프레임 | 속성 | 피그마 | 코드 | 결과 |');
    expect(body).toContain('| 0% (0ms) | WindowFrame OPACITY → opacity | 0 | opacity: 0 | 같음 |');
    expect(body).toContain(`[실행 결과](${RUN_URL})`);
  });

  it('다른 값, 실행 중 값, 시간 오류를 적고 다른 곳이 있는 견본은 펼친다', () => {
    const [body = ''] = renderMotionComments(
      [
        result('motion-window-minimize', {
          rows: [
            row({ status: 'runtime', note: '실행 중 값 --x: 변수와 부호만 본다' }),
            row({ figma: '1', code: 'opacity: 0.5', status: 'different', note: '값이 다르다' }),
          ],
          timingErrors: ['CSS 애니메이션 시간 300ms가 json의 토큰 값(333ms)에 없다.'],
        }),
      ],
      RUN_URL,
    );
    expect(body).toContain('모션 검사: 견본 1개, 다름 1개');
    expect(body).toContain(
      '<details open><summary>❌ motion-window-minimize (키프레임 값 다름 1곳, 시간 오류 1개)</summary>',
    );
    expect(body).toContain('| 실행 중 값(부호 같음) |');
    expect(body).toContain('| 1 | opacity: 0.5 | 다름: 값이 다르다 |');
    expect(body).toContain('- CSS 애니메이션 시간 300ms가 json의 토큰 값(333ms)에 없다.');
  });

  it('모션 검사 댓글은 캡처 표 댓글과 다른 숨은 표시로 찾아 따로 고친다', () => {
    const [body = ''] = renderMotionComments([result('motion-window-open')], RUN_URL);
    expect(markerIndex(body, 'motion-check')).toBe(1);
    expect(markerIndex(body, COMMENT_MARKER)).toBeUndefined();
  });

  it('결과가 없으면 이유를 적는다', () => {
    const [body = ''] = renderMotionComments([], RUN_URL);
    expect(body).toContain('모션 검사 결과가 없다');
  });
});
