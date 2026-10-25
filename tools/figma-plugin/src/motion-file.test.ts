import { describe, expect, it } from 'vitest';

import { type MotionExport, motionText, motionUrl } from './motion-file';

/**
 * 숫자 표기를 확인할 모션 자료를 만든다.
 * @param time 두 번째 키프레임 위치(ms)
 * @param value 두 번째 키프레임 값
 * @returns 모션 자료
 */
function motion(time: number, value: number): MotionExport {
  return {
    name: 'motion-progress-ring',
    nodeId: '1:2',
    url: motionUrl('KEY', '1:2'),
    duration: { ms: time, token: 'motion/duration/progress-ring' },
    delay: { ms: 0, token: null },
    iterations: null,
    tracks: [
      {
        node: 'progress-ring/Arc',
        nodeKind: 'asset',
        path: 'ProgressRing / Arc',
        property: 'ROTATION',
        operation: 'SET',
        duration: { ms: time, token: 'motion/duration/progress-ring' },
        delay: { ms: 0, token: null },
        keyframes: [
          { time: 0, offset: 0, value: -0, easing: null, valueToken: null },
          {
            time,
            offset: 1,
            value,
            easing: 'motion/easing/point-to-point',
            valueToken: null,
          },
        ],
      },
    ],
  };
}

// @codocs [[피그마 연동:모션]]
describe('모션', () => {
  it('같은 디자인을 다시 내보내면 같은 바이트가 나오도록 키를 정렬하고 숫자를 정한 자리에서 반올림한다', () => {
    const text = motionText(motion(2000.0000001, -720.00000004));
    expect(text).toBe(motionText(motion(2000, -720)));
    expect(text).toContain('"value": 0,');
    expect(text).not.toContain('-0');
    expect(Object.keys(JSON.parse(text) as object)).toEqual([
      'delay',
      'duration',
      'iterations',
      'name',
      'nodeId',
      'tracks',
      'url',
    ]);
  });

  it('견본 링크는 figma.json 파일 키와 노드 ID(`:` → `-`)로 만든다', () => {
    expect(motionUrl('XV9Y', '517:16130')).toBe(
      'https://www.figma.com/design/XV9Y?node-id=517-16130',
    );
  });
});
