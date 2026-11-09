import { describe, expect, it } from 'vitest';

import { motionText } from '../motion-file';
import { checkMotionSample } from './check-motion';
import type { MotionSampleData } from './motion-data';
import {
  easing,
  keyframe,
  motionVariables,
  track,
  unbound,
  windowOpenSample,
} from './motion-data.fixture';

const FILE_KEY = 'FILEKEY';

/**
 * 견본을 바꿔 검사하고 위반 이유만 돌려준다.
 * @param change 견본을 바꾸는 함수
 * @returns 위반 이유 목록(통과하면 빈 목록)
 */
function reasonsAfter(change: (sample: MotionSampleData) => void): string[] {
  const sample = windowOpenSample();
  change(sample);
  const result = checkMotionSample(sample, motionVariables, FILE_KEY);
  return result.ok ? [] : result.violations.map((violation) => violation.reason);
}

/**
 * 통과해야 하는 견본을 검사해 내보낼 자료를 돌려준다.
 * @param sample 견본
 * @returns 내보낼 자료
 */
function exported(
  sample: MotionSampleData,
): Extract<ReturnType<typeof checkMotionSample>, { ok: true }> {
  const result = checkMotionSample(sample, motionVariables, FILE_KEY);
  if (!result.ok) {
    throw new Error(result.violations.map((violation) => violation.reason).join('\n'));
  }
  return result;
}

// @codocs [[피그마 연동:모션]]
describe('모션', () => {
  it('트랙 길이가 motion/duration/* 값(ms)과 같으면 통과하고 그 변수를 적는다(키프레임은 초)', () => {
    const { motion } = exported(windowOpenSample());
    expect(motion.tracks.map((item) => item.duration)).toEqual([
      { ms: 250, token: 'motion/duration/normal' },
      { ms: 250, token: 'motion/duration/normal' },
    ]);
  });

  it('소수로 넣은 시간(0.167초)의 작은 오차는 같은 값으로 본다', () => {
    const sample = windowOpenSample();
    sample.tracks = [track('OPACITY', [keyframe(0, 1), keyframe(0.167, 0, easing('fade'))])];
    expect(exported(sample).motion.duration.token).toBe('motion/duration/fast');
  });

  it('트랙 길이가 어느 motion/duration/* 값과도 같지 않으면 막는다', () => {
    expect(
      reasonsAfter((sample) => {
        sample.tracks = [track('OPACITY', [keyframe(0, 0), keyframe(0.3, 1, easing('fade'))])];
      }),
    ).toEqual([expect.stringContaining('트랙 길이(첫 키프레임 → 끝 키프레임) 300ms')]);
  });

  it('첫 키프레임이 0초가 아니면 시작 지연이 motion/delay/* 값이어야 한다', () => {
    const delayed = windowOpenSample();
    delayed.tracks = [track('OPACITY', [keyframe(2.5, 0), keyframe(2.75, 1, easing('fade'))])];
    const { motion } = exported(delayed);
    expect(motion.tracks[0]?.delay).toEqual({ ms: 2500, token: 'motion/delay/boot-screen' });
    expect(motion.delay).toEqual({ ms: 2500, token: 'motion/delay/boot-screen' });

    expect(
      reasonsAfter((sample) => {
        sample.tracks = [track('OPACITY', [keyframe(0.1, 0), keyframe(0.35, 1, easing('fade'))])];
      }),
    ).toEqual([expect.stringContaining('시작 지연(첫 키프레임 위치) 100ms')]);
  });

  it('첫 키프레임 뒤 모든 키프레임 이징이 motion/easing/* EASING 변수에 연결돼야 한다', () => {
    expect(
      reasonsAfter((sample) => {
        sample.tracks = [track('OPACITY', [keyframe(0, 0), keyframe(0.25, 1, unbound)])];
      }),
    ).toEqual(['이징(EASE_OUT)이 변수에 연결되어 있지 않다']);
    expect(
      reasonsAfter((sample) => {
        sample.tracks = [
          track('OPACITY', [
            keyframe(0, 0),
            keyframe(0.25, 1, {
              kind: 'variable',
              name: 'motion/easing/fade',
              resolvedType: 'STRING',
            }),
          ]),
        ];
      }),
    ).toEqual([expect.stringContaining('EASING 타입이 아니라(STRING)')]);
  });

  it('첫 키프레임의 이징은 쓰이지 않으므로 보지 않고 json에 null로 적는다', () => {
    const { motion } = exported(windowOpenSample());
    expect(motion.tracks[0]?.keyframes.map((item) => item.easing)).toEqual([
      null,
      'motion/easing/fade',
    ]);
  });

  it('배율·투명도 등 값이 motion/* FLOAT 변수 값과 같으면 짝을 적고 막지 않는다', () => {
    const { motion } = exported(windowOpenSample());
    const scale = motion.tracks.find((item) => item.property === 'SCALE_XY');
    expect(scale?.keyframes.map((item) => item.valueToken)).toEqual([
      'motion/scale/window-enter',
      null,
    ]);
  });

  it('이동(TRANSLATION)은 값이 변수와 같아도 짝을 찾지 않는다', () => {
    const sample = windowOpenSample();
    sample.tracks.push(
      track('TRANSLATION_Y', [keyframe(0, 0.96), keyframe(0.25, 0, easing('direct-entrance'))]),
    );
    const translation = exported(sample).motion.tracks.find(
      (item) => item.property === 'TRANSLATION_Y',
    );
    expect(translation?.keyframes.map((item) => item.valueToken)).toEqual([null, null]);
  });

  it('@repeat·@trigger 줄이 없으면 막는다', () => {
    const reasons = reasonsAfter((sample) => {
      sample.annotations = ['@repeat 1'];
    });
    expect(reasons).toEqual([expect.stringContaining('`@trigger` 줄이 없다') as string]);
  });

  it('모르는 키와 잘못된 반복 값을 막는다', () => {
    const reasons = reasonsAfter((sample) => {
      sample.annotations = ['@repeat twice\n@trigger open\n@loop 1'];
    });
    expect(reasons.filter((reason) => reason.startsWith('주석의'))).toEqual([
      expect.stringContaining('`@repeat twice`') as string,
      expect.stringContaining('`@loop 1`') as string,
    ]);
  });

  it('@ 줄 값을 json에 담고 @repeat로 반복 횟수를 정한다', () => {
    const sample = structuredClone(windowOpenSample());
    sample.annotations = ['@repeat infinite\n@trigger open\n@trigger hover'];
    const result = checkMotionSample(sample, motionVariables, FILE_KEY);
    expect(result.ok && result.motion.iterations).toBe('infinite');
    expect(result.ok && result.motion.directives).toEqual({
      repeat: ['infinite'],
      trigger: ['open', 'hover'],
    });
  });

  it('견본 길이를 넘는 트랙은 견본 길이까지만 담고 전체 길이에 넣지 않는다', () => {
    const sample = structuredClone(windowOpenSample());
    sample.lengthMs = 250;
    sample.tracks.push(
      track('ROTATION', [
        keyframe(0, 0, unbound),
        keyframe(1, 180, easing('fade')),
        keyframe(2, 360, easing('fade')),
      ]),
    );
    const result = checkMotionSample(sample, motionVariables, FILE_KEY);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.motion.duration).toEqual({ ms: 250, token: 'motion/duration/normal' });
      const clipped = result.motion.tracks.find((item) => item.isTruncated === true);
      expect(clipped?.keyframes.map((item) => item.time)).toEqual([0]);
      expect(
        result.motion.tracks.filter((item) => item.isTruncated !== true).length,
      ).toBeGreaterThan(0);
    }
  });

  it('json에 견본 이름, 노드 ID, 견본 링크, 반복(@repeat)을 담는다', () => {
    const { motion } = exported(windowOpenSample());
    expect(motion).toMatchObject({
      name: 'motion-window-open',
      nodeId: '12:34',
      url: 'https://www.figma.com/design/FILEKEY?node-id=12-34',
      duration: { ms: 250, token: 'motion/duration/normal' },
      delay: { ms: 0, token: null },
      iterations: 1,
    });
  });

  it('같은 견본을 다시 내보내면 트랙 순서가 달라도 같은 바이트가 나온다', () => {
    const first = windowOpenSample();
    const second = windowOpenSample();
    second.tracks.reverse();
    expect(motionText(exported(second).motion)).toBe(motionText(exported(first).motion));
  });
});

// @codocs [[피그마 연동:구조 검사]]
describe('구조 검사', () => {
  it('한 견본의 위반은 위치(견본 / 레이어 / 항목 / 키프레임)·이유·고칠 방법과 함께 모두 한 번에 돌려준다', () => {
    const sample = windowOpenSample();
    sample.tracks = [
      track('OPACITY', [keyframe(0, 0), keyframe(0.3, 1, unbound)]),
      track('SCALE_XY', [keyframe(0, { x: 1, y: 1 }), keyframe(0.25, { x: 1, y: 1 }, unbound)]),
    ];
    const result = checkMotionSample(sample, motionVariables, FILE_KEY);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.violations.map((violation) => violation.where)).toEqual([
      'motion-window-open / Window / OPACITY',
      'motion-window-open / Window / OPACITY 2번째 키프레임(300ms)',
      'motion-window-open / Window / SCALE_XY 2번째 키프레임(250ms)',
    ]);
    expect(result.violations.every((violation) => violation.fix !== '')).toBe(true);
  });

  it('트랙 위반은 키프레임이 걸린 노드를, 견본 자체 위반은 견본 프레임을 가리킨다', () => {
    const sample = windowOpenSample();
    sample.name = 'Window open';
    sample.tracks = [
      track('OPACITY', [keyframe(0, 0), keyframe(0.3, 1, unbound)], { nodeId: '12:99' }),
    ];
    const result = checkMotionSample(sample, motionVariables, FILE_KEY);
    expect(result.ok ? [] : result.violations.map((violation) => violation.nodeId)).toEqual([
      '12:34',
      '12:99',
      '12:99',
    ]);
  });

  it('견본 이름이 motion-* 꼴이 아니거나 키프레임이 없으면 막는다', () => {
    expect(
      reasonsAfter((sample) => {
        sample.name = 'Window open';
        sample.tracks = [];
      }),
    ).toEqual([expect.stringContaining('모션 클래스 이름 꼴'), '키프레임이 걸린 노드가 없다']);
  });

  it('읽는 중에 찾은 문제(정의한 노드를 못 찾은 이징 등)도 위반으로 막는다', () => {
    expect(
      reasonsAfter((sample) => {
        sample.problems.push({
          path: 'Window / fills[0]',
          nodeId: '12:35',
          reason: '읽을 수 없다',
          fix: '고친다',
        });
        sample.tracks = [
          track('OPACITY', [keyframe(0, 0), keyframe(0.25, 1, { kind: 'unknown' })]),
        ];
      }),
    ).toEqual(['읽을 수 없다', expect.stringContaining('정의한 노드를 찾지 못해')]);
  });
});

/**
 * 새 자리(흐름 프레임, 원본)에서 읽은 창 열기 움직임을 만든다.
 * @param change 바꿀 값
 * @returns 움직임 데이터
 */
function currentSample(change: Partial<MotionSampleData> = {}): MotionSampleData {
  return {
    ...windowOpenSample(),
    source: 'flow',
    annotations: [],
    isLooping: false,
    ...change,
  };
}

// @codocs [[피그마 연동:모션]]
// @codocs [[디자인 기반:모션 견본]]
describe('움직임이 일어나는 자리', () => {
  it('반복은 재생 설정 Loop로 읽고 @repeat·@trigger 줄을 요구하지 않는다', () => {
    expect(exported(currentSample()).motion.iterations).toBe(1);
    expect(exported(currentSample({ isLooping: true })).motion.iterations).toBe('infinite');
  });

  it('Loop를 읽지 못하면 막는다', () => {
    const result = checkMotionSample(currentSample({ isLooping: null }), motionVariables, FILE_KEY);
    expect(result.ok ? [] : result.violations.map((violation) => violation.reason)).toEqual([
      '재생 설정 Loop를 읽지 못해 반복 여부를 정할 수 없다',
    ]);
  });

  it('이름이 없는 원본은 Development 주석으로 이름을 달라고 막는다', () => {
    const result = checkMotionSample(
      currentSample({ source: 'component', name: null, label: 'Figure / State=Loading' }),
      motionVariables,
      FILE_KEY,
    );
    expect(result.ok ? [] : result.violations).toEqual([
      expect.objectContaining({
        where: 'Figure / State=Loading',
        fix: expect.stringContaining('Development 주석') as string,
      }),
    ]);
  });

  it('원본 description의 @ 줄을 읽고 더 쓰지 않는 줄은 알린다', () => {
    const result = exported(
      currentSample({ source: 'component', description: '@direction alternate\n@hold 끄는 동안' }),
    );
    expect(result.motion.directives).toEqual({ direction: ['alternate'] });
    expect(result.notices).toEqual([expect.stringContaining('`@hold 끄는 동안`')]);
  });

  it('주석과 자리를 json에 싣는다', () => {
    const notes = [{ path: 'Window', category: 'Development', text: '도착 위치' }];
    const text = motionText(exported(currentSample({ notes })).motion);
    expect(JSON.parse(text)).toMatchObject({ source: 'flow', notes });
  });
});
