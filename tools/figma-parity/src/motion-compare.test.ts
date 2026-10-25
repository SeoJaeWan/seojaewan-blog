import { describe, expect, it } from 'vitest';

import {
  compareMotion,
  findMotionStoryId,
  type ObservedAnimation,
  parseEasing,
  tokenCurve,
  tokenDuration,
} from './motion-compare.ts';
import { parseMotionSpec } from './motion-spec.ts';

/**
 * tokens.json의 시간 토큰을 만든다.
 * @param value ms
 * @returns DTCG 토큰
 */
function duration(value: number): object {
  return { $type: 'duration', $value: { unit: 'ms', value } };
}

const tokensJson = {
  motion: {
    duration: {
      normal: duration(250),
      'progress-ring': duration(2000),
      ring: { $type: 'duration', $value: '{motion.duration.progress-ring}' },
    },
    delay: { 'boot-screen': duration(2500) },
    easing: {
      'direct-entrance': { $type: 'cubicBezier', $value: [0, 0, 0, 1] },
      fade: { $type: 'cubicBezier', $value: [0, 0, 1, 1] },
    },
  },
};

/**
 * 창 열기 json(배율과 투명도 트랙, normal, direct-entrance·fade)을 만든다.
 * @returns json 값
 */
function windowOpenJson(): Record<string, unknown> {
  /**
   * 트랙을 만든다.
   * @param property 항목
   * @param easing 두 번째 키프레임 이징
   * @returns 트랙 값
   */
  function track(property: string, easing: string): object {
    return {
      node: 'Window',
      property,
      duration: { ms: 250, token: 'motion/duration/normal' },
      delay: { ms: 0, token: null },
      keyframes: [
        { time: 0, easing: null },
        { time: 250, easing },
      ],
    };
  }
  return {
    name: 'motion-window-open',
    url: 'https://www.figma.com/design/KEY?node-id=1-2',
    iterations: null,
    tracks: [
      track('SCALE_XY', 'motion/easing/direct-entrance'),
      track('OPACITY', 'motion/easing/fade'),
    ],
  };
}

/**
 * 모션 스토리에서 읽은 CSS 애니메이션을 만든다.
 * @param overrides 바꿀 값
 * @returns CSS 애니메이션
 */
function observed(overrides: Partial<ObservedAnimation> = {}): ObservedAnimation {
  return {
    name: 'motion-window-open-scale',
    target: 'div.motion-window-open',
    duration: 250,
    delay: 0,
    iterations: 1,
    easings: ['cubic-bezier(0, 0, 0, 1)'],
    ...overrides,
  };
}

const fadeAnimation = observed({ name: 'motion-window-open-fade', easings: ['linear'] });

// @codocs [[피그마 연동:모션]]
describe('모션', () => {
  it('모션 스토리의 시간·이징·지연이 json 토큰 짝(tokens.json 값)과 같으면 통과한다', () => {
    const spec = parseMotionSpec(windowOpenJson(), 'motion-window-open.json');
    expect(compareMotion(spec, tokensJson, [observed(), fadeAnimation])).toEqual([]);
  });

  it('CSS 애니메이션 시간이 json 트랙 길이 토큰 값과 다르면 실패한다', () => {
    const spec = parseMotionSpec(windowOpenJson(), 'motion-window-open.json');
    expect(compareMotion(spec, tokensJson, [observed({ duration: 300 }), fadeAnimation])).toEqual([
      'CSS 애니메이션 시간 300ms가 json의 토큰 값(250ms)에 없다.',
    ]);
  });

  it('CSS 키프레임 이징이 json 이징 토큰 곡선에 없거나, 쓰지 않은 이징 토큰이 있으면 실패한다', () => {
    const spec = parseMotionSpec(windowOpenJson(), 'motion-window-open.json');
    expect(
      compareMotion(spec, tokensJson, [observed({ easings: ['ease'] }), fadeAnimation]),
    ).toEqual([
      'div.motion-window-open motion-window-open-scale: 이징 ease가 json의 이징 토큰(motion/easing/direct-entrance, motion/easing/fade)에 없다.',
      'json의 이징 토큰 motion/easing/direct-entrance(0, 0, 0, 1)을 쓰는 CSS 키프레임이 없다.',
    ]);
  });

  it('json에 시작 지연 토큰이 있으면 CSS 지연이 그 값이어야 한다', () => {
    const json = windowOpenJson();
    json.tracks = [
      {
        node: 'BootScreen',
        property: 'OPACITY',
        duration: { ms: 250, token: 'motion/duration/normal' },
        delay: { ms: 2500, token: 'motion/delay/boot-screen' },
        keyframes: [{ easing: null }, { easing: 'motion/easing/fade' }],
      },
    ];
    const spec = parseMotionSpec(json, 'motion-boot-screen-exit.json');
    expect(compareMotion(spec, tokensJson, [{ ...fadeAnimation, delay: 2500 }])).toEqual([]);
    expect(compareMotion(spec, tokensJson, [fadeAnimation])).toEqual([
      'CSS 애니메이션 지연 0ms가 json의 토큰 값(2500ms)에 없다.',
      'json의 지연 토큰 값 2500ms를 쓰는 CSS 애니메이션이 없다(CSS: 0ms).',
    ]);
  });

  it('json에 반복 횟수가 있으면 비교하고, 피그마에서 알 수 없으면(null) 비교하지 않는다', () => {
    const json = windowOpenJson();
    const unknown = parseMotionSpec(json, 'a.json');
    expect(
      compareMotion(unknown, tokensJson, [observed({ iterations: 'infinite' }), fadeAnimation]),
    ).toEqual([]);
    const once = parseMotionSpec({ ...json, iterations: 1 }, 'a.json');
    expect(
      compareMotion(once, tokensJson, [observed({ iterations: 'infinite' }), fadeAnimation]),
    ).toEqual([
      'div.motion-window-open motion-window-open-scale: 반복 횟수 infinite가 json의 1와 다르다.',
    ]);
  });

  it('json의 시간이 지금 토큰 값과 다르면(피그마에서 토큰을 바꾼 뒤 다시 내보내지 않음) 실패한다', () => {
    const json = windowOpenJson();
    json.tracks = [
      {
        node: 'Window',
        property: 'OPACITY',
        duration: { ms: 300, token: 'motion/duration/normal' },
        delay: { ms: 0, token: null },
        keyframes: [{ easing: null }, { easing: 'motion/easing/fade' }],
      },
    ];
    expect(compareMotion(parseMotionSpec(json, 'a.json'), tokensJson, [fadeAnimation])).toEqual([
      'Window OPACITY: json의 트랙 길이 300ms가 지금 토큰 motion/duration/normal 값 250ms와 다르다. 피그마에서 다시 내보낸다.',
    ]);
  });

  it('재생 중인 CSS 애니메이션이 없으면 실패한다', () => {
    const spec = parseMotionSpec(windowOpenJson(), 'a.json');
    expect(compareMotion(spec, tokensJson, [])).toEqual([
      expect.stringContaining('재생 중인 CSS 애니메이션을 찾지 못했다'),
    ]);
  });

  it('토큰 값은 tokens.json에서 별칭을 따라 읽고, CSS 이징 키워드는 곡선으로 바꿔 비교한다', () => {
    expect(tokenDuration(tokensJson, 'motion/duration/ring')).toBe(2000);
    expect(tokenCurve(tokensJson, 'motion/easing/fade')).toEqual([0, 0, 1, 1]);
    expect(parseEasing('linear')).toEqual([0, 0, 1, 1]);
    expect(parseEasing('cubic-bezier(0.55, 0.55, 0, 1)')).toEqual([0.55, 0.55, 0, 1]);
    expect(parseEasing('steps(4)')).toBeNull();
  });

  it('모션 스토리는 디자인 시스템 Storybook에서 제목이 Motion/<이름>인 스토리다', () => {
    const index = {
      entries: {
        a: {
          id: 'motion-a--default',
          title: 'Motion/motion-a',
          name: 'Default',
          importPath: './x',
          type: 'story',
        },
      },
    };
    expect(findMotionStoryId(index, 'motion-a')).toEqual({ ok: true, id: 'motion-a--default' });
    const missing = findMotionStoryId(index, 'motion-b');
    expect(missing.ok).toBe(false);
    expect(missing.ok ? '' : missing.message).toContain('"Motion/motion-b"');
  });

  it('플러그인 검사를 거치지 않은 json(트랙 길이 토큰이나 이징 토큰이 없음)은 읽을 때 실패한다', () => {
    const json = windowOpenJson();
    json.tracks = [
      {
        node: 'Window',
        property: 'OPACITY',
        duration: { ms: 300, token: null },
        delay: { ms: 0, token: null },
        keyframes: [{ easing: null }, { easing: null }],
      },
    ];
    expect(() => parseMotionSpec(json, 'a.json')).toThrow('a.json.tracks[0].keyframes[1].easing');
  });
});
