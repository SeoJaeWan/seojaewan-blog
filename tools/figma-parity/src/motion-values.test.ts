import { describe, expect, it } from 'vitest';

import { parseValueTracks } from './motion-spec.ts';
import {
  compareMotionValues,
  type CssKeyframe,
  isFailedRow,
  type ObservedEffect,
  parseAngle,
  parseScale,
  parseTranslate,
  type ValueTrack,
  variableNames,
} from './motion-values.ts';

const tokenVariables = new Set(['--motion-scale-window-enter', '--motion-duration-normal']);

/**
 * 테스트용 json 트랙을 만든다.
 * @param property 피그마 항목
 * @param values 키프레임 위치 → 값
 * @param node 노드 이름
 * @returns json 트랙
 */
function track(property: string, values: [number, unknown][], node = 'WindowFrame'): ValueTrack {
  return {
    node,
    path: node,
    property,
    operation: 'SET',
    durationMs: 250,
    keyframes: values.map(([offset, value]) => ({ offset, value })),
  };
}

/**
 * 테스트용 CSS 키프레임을 만든다. 선언을 따로 주지 않으면 계산값과 같다.
 * @param frames 위치 → CSS 값
 * @returns 키프레임
 */
function keyframes(frames: [number, Record<string, string>][]): CssKeyframe[] {
  return frames.map(([offset, values]) => ({ offset, values }));
}

/**
 * 테스트용 CSS 애니메이션을 만든다.
 * @param computed 위치 → getKeyframes() 값
 * @param change 바꿀 필드
 * @returns CSS 애니메이션
 */
function effect(
  computed: [number, Record<string, string>][],
  change: Partial<ObservedEffect> = {},
): ObservedEffect {
  return {
    name: 'motion-window-open',
    target: 'div.motion-window-open',
    element: 0,
    node: null,
    box: { width: 800, height: 500 },
    pathLength: null,
    keyframes: keyframes(computed),
    declarations: keyframes(computed),
    ...change,
  };
}

// @codocs [[피그마 연동:모션]]
describe('모션', () => {
  it('json 트랙의 키프레임 값을 변환표의 CSS 속성 값과 키프레임 위치마다 비교한다', () => {
    const rows = compareMotionValues(
      [
        track('OPACITY', [
          [0, 0],
          [1, 1],
        ]),
        track('SCALE_XY', [
          [0, { x: 0.96, y: 0.96 }],
          [1, { x: 1, y: 1 }],
        ]),
      ],
      [
        effect(
          [
            [0, { opacity: '0', scale: '0.96' }],
            [1, { opacity: '1', scale: '1' }],
          ],
          {
            declarations: keyframes([
              [0, { opacity: '0', scale: 'var(--motion-scale-window-enter)' }],
              [1, { opacity: '1', scale: '1' }],
            ]),
          },
        ),
      ],
      tokenVariables,
    );
    expect(
      rows.map((row) => [row.keyframe, row.property, row.figma, row.code, row.status]),
    ).toEqual([
      ['0% (0ms)', 'WindowFrame OPACITY → opacity', '0', 'opacity: 0', 'same'],
      ['100% (250ms)', 'WindowFrame OPACITY → opacity', '1', 'opacity: 1', 'same'],
      ['0% (0ms)', 'WindowFrame SCALE_XY → scale', '(0.96, 0.96)', 'scale: 0.96', 'same'],
      ['100% (250ms)', 'WindowFrame SCALE_XY → scale', '(1, 1)', 'scale: 1', 'same'],
    ]);
  });

  it('반올림 차이(비율 0.001, 이동 0.5px, 회전 0.5° 이내)는 같다고 보고, 넘으면 다르다고 한다', () => {
    const tracks = [
      track('OPACITY', [[0, 0.5]]),
      track('TRANSLATION_XY', [[0, { x: 10, y: 0 }]]),
      track('ROTATION', [[0, -90]]),
    ];
    const close = compareMotionValues(
      tracks,
      [effect([[0, { opacity: '0.5004', translate: '10.4px 0px', rotate: '90.4deg' }]])],
      tokenVariables,
    );
    expect(close.map((row) => row.status)).toEqual(['same', 'same', 'same']);
    const far = compareMotionValues(
      tracks,
      [effect([[0, { opacity: '0.502', translate: '10.6px 0px', rotate: '91deg' }]])],
      tokenVariables,
    );
    expect(far.map((row) => row.status)).toEqual(['different', 'different', 'different']);
    expect(far.every(isFailedRow)).toBe(true);
  });

  it('회전은 피그마 부호를 뒤집어 CSS rotate와 비교한다', () => {
    const rows = compareMotionValues(
      [track('ROTATION', [[0.5, -450]], 'Arc')],
      [effect([[0.5, { rotate: '450deg' }]])],
      tokenVariables,
    );
    expect(rows[0]).toMatchObject({ code: 'rotate: 450deg → -450°', status: 'same' });
  });

  it('경로 트림은 pathLength 기준 stroke-dasharray(끝-시작)와 stroke-dashoffset(-시작)으로 읽는다', () => {
    const rows = compareMotionValues(
      [track('PATH_TRIM_START', [[1, 0.5]], 'Arc'), track('PATH_TRIM_END', [[1, 0.5]], 'Arc')],
      [
        effect([[1, { 'stroke-dasharray': '0px, 1px', 'stroke-dashoffset': '-0.5px' }]], {
          pathLength: 1,
        }),
      ],
      tokenVariables,
    );
    expect(rows.map((row) => row.status)).toEqual(['same', 'same']);
    const wrong = compareMotionValues(
      [track('PATH_TRIM_END', [[1, 0.5]], 'Arc')],
      [
        effect([[1, { 'stroke-dasharray': '0.2px, 1px', 'stroke-dashoffset': '-0.5px' }]], {
          pathLength: 1,
        }),
      ],
      tokenVariables,
    );
    expect(wrong[0]?.status).toBe('different');
  });

  it('이동의 %는 요소 크기로 px로 바꿔 비교한다', () => {
    const rows = compareMotionValues(
      [track('TRANSLATION_Y', [[0, 720]], 'ShellSurface')],
      [effect([[0, { translate: '0px 100%' }]], { box: { width: 640, height: 720 } })],
      tokenVariables,
    );
    expect(rows[0]).toMatchObject({ code: 'translate: 0px 100% → 720px', status: 'same' });
  });

  it('transform 함수로 움직이면 transform에서 이동·배율·회전을 읽는다', () => {
    const scaled = compareMotionValues(
      [track('SCALE_XY', [[0, { x: 0.96, y: 0.96 }]])],
      [effect([[0, { transform: 'scale(0.96)' }]])],
      tokenVariables,
    );
    const moved = compareMotionValues(
      [track('TRANSLATION_X', [[0, 12]]), track('ROTATION', [[0, -30]])],
      [effect([[0, { transform: 'translateX(12px)' }]]), effect([[0, { rotate: '30deg' }]])],
      tokenVariables,
    );
    expect([...scaled, ...moved].map((row) => row.status)).toEqual(['same', 'same', 'same']);
  });

  it('토큰이 아닌 CSS 변수를 쓰는 자리는 실행 중 값이라 값 대신 변수를 쓰는지와 부호만 본다', () => {
    const declarations = keyframes([
      [
        0,
        {
          translate: 'var(--motion-window-taskbar-offset-x) var(--motion-window-taskbar-offset-y)',
        },
      ],
    ]);
    const minimize = [track('TRANSLATION_XY', [[0, { x: -380, y: 294 }]])];
    // 스토리 대표값이 피그마와 달라도 부호가 같으면 통과한다
    const same = compareMotionValues(
      minimize,
      [effect([[0, { translate: '-100px 50px' }]], { declarations })],
      tokenVariables,
    );
    expect(same[0]).toMatchObject({
      status: 'runtime',
      code: 'translate: var(--motion-window-taskbar-offset-x) var(--motion-window-taskbar-offset-y) (스토리 대표값 (-100, 50)px)',
    });
    expect(same.some(isFailedRow)).toBe(false);
    // 부호(방향)가 다르면 실패한다
    const flipped = compareMotionValues(
      minimize,
      [effect([[0, { translate: '380px 294px' }]], { declarations })],
      tokenVariables,
    );
    expect(flipped[0]?.status).toBe('different');
    expect(flipped[0]?.note).toContain('--motion-window-taskbar-offset-x');
    expect(flipped[0]?.note).not.toContain('--motion-window-taskbar-offset-y');
  });

  it('토큰 CSS 변수(var(--motion-*))는 실행 중 값이 아니라 푼 값으로 비교한다', () => {
    const rows = compareMotionValues(
      [track('SCALE_XY', [[0, { x: 0.96, y: 0.96 }]])],
      [
        effect([[0, { scale: '0.9' }]], {
          declarations: keyframes([[0, { scale: 'var(--motion-scale-window-enter)' }]]),
        }),
      ],
      tokenVariables,
    );
    expect(rows[0]?.status).toBe('different');
  });

  it('성분마다 실행 중 값을 가린다(SCALE_X는 scale의 첫 값, SCALE_Y는 둘째 값)', () => {
    const declarations = keyframes([[0, { scale: 'var(--motion-window-snap-from-scale-x) 0.7' }]]);
    const rows = compareMotionValues(
      [track('SCALE_X', [[0, 0.6]]), track('SCALE_Y', [[0, 0.5]])],
      [effect([[0, { scale: '0.3 0.7' }]], { declarations })],
      tokenVariables,
    );
    expect(rows.map((row) => row.status)).toEqual(['runtime', 'different']);
  });

  it('코드에 없는 키프레임, 피그마에 없는 키프레임과 움직임은 실패한다', () => {
    const rows = compareMotionValues(
      [
        track('OPACITY', [
          [0, 0],
          [0.5, 0.5],
          [1, 1],
        ]),
      ],
      [
        effect([
          [0, { opacity: '0', rotate: '0deg' }],
          [0.8, { opacity: '0.9' }],
          [1, { opacity: '1', rotate: '10deg' }],
        ]),
      ],
      tokenVariables,
    );
    expect(rows.filter(isFailedRow).map((row) => [row.keyframe, row.figma, row.code])).toEqual([
      ['50% (125ms)', '0.5', '키프레임 없음'],
      ['80% (200ms)', '키프레임 없음', 'opacity: 0.9'],
      ['-', '트랙 없음', 'motion-window-open'],
    ]);
  });

  it('변환표에 없는 항목과 SET이 아닌 연산은 비교할 수 없어 실패한다', () => {
    const rows = compareMotionValues(
      [track('CORNER_RADIUS', [[0, 4]]), { ...track('OPACITY', [[0, 1]]), operation: 'OFFSET' }],
      [effect([[0, { opacity: '1' }]])],
      tokenVariables,
    );
    expect(rows.map((row) => row.status)).toEqual(['missing', 'missing', 'missing']);
    expect(rows[0]?.note).toContain('변환표에 없는 항목');
    expect(rows[1]?.note).toContain('OFFSET');
    // 짝짓지 못한 CSS 투명도는 피그마에 없는 움직임으로 남는다
    expect(rows[2]?.figma).toBe('트랙 없음');
  });

  it('같은 CSS 속성을 움직이는 요소가 여럿이면 data-motion-node로 json 노드와 짝짓고, 없으면 실패한다', () => {
    const tracks = [
      track('OPACITY', [[0, 0]], 'Start/JumpList'),
      track('OPACITY', [[0, 1]], 'list'),
    ];
    const grid = effect([[0, { opacity: '0' }]], { element: 0, name: 'grid-fade' });
    const list = effect([[0, { opacity: '1' }]], { element: 1, name: 'list-fade' });
    expect(compareMotionValues(tracks, [grid, list], tokenVariables)[0]?.note).toContain(
      'data-motion-node="Start/JumpList"',
    );
    const marked = compareMotionValues(
      tracks,
      [
        { ...grid, node: 'Start/JumpList' },
        { ...list, node: 'list' },
      ],
      tokenVariables,
    );
    expect(marked.map((row) => row.status)).toEqual(['same', 'same']);
    // 바꿔 단 표시는 값이 달라 실패한다
    const swapped = compareMotionValues(
      tracks,
      [
        { ...grid, node: 'list' },
        { ...list, node: 'Start/JumpList' },
      ],
      tokenVariables,
    );
    expect(swapped.map((row) => row.status)).toEqual(['different', 'different']);
  });

  it('CSS 값 글을 읽는다', () => {
    expect(parseScale('0.6 0.7')).toEqual({ x: 0.6, y: 0.7 });
    expect(parseScale('none')).toEqual({ x: 1, y: 1 });
    expect(parseTranslate('0px', { width: 10, height: 10 })).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('50% -2px', { width: 10, height: 10 })).toEqual({ x: 5, y: -2 });
    expect(parseAngle('0.5turn')).toBe(180);
    expect(parseAngle('abc')).toBeNull();
    expect(variableNames('var(--a) calc(var(--b) * 2)')).toEqual(['--a', '--b']);
  });

  it('json에서 트랙의 노드·항목·연산·키프레임 위치와 값을 읽는다', () => {
    const tracks = parseValueTracks(
      {
        tracks: [
          {
            node: 'WindowFrame',
            path: 'WindowFrame',
            property: 'OPACITY',
            operation: 'SET',
            duration: { ms: 250 },
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 1, value: 1 },
            ],
          },
        ],
      },
      'a.json',
    );
    expect(tracks).toEqual([
      track('OPACITY', [
        [0, 0],
        [1, 1],
      ]),
    ]);
    expect(() =>
      parseValueTracks(
        { tracks: [{ node: 'A', property: 'OPACITY', duration: { ms: 1 }, keyframes: [{}] }] },
        'a.json',
      ),
    ).toThrow('a.json.tracks[0].keyframes[0].offset: 숫자여야 한다.');
  });
});
