import type {
  EasingData,
  KeyframeData,
  MotionSampleData,
  MotionVariable,
  TrackData,
} from './motion-data';

// 모션 검사 테스트 데이터. Windows 모션 값([[디자인 기반:모션]] 표)을 쓴다.

export const motionVariables: MotionVariable[] = [
  { name: 'motion/delay/boot-screen', resolvedType: 'FLOAT', value: 2500 },
  { name: 'motion/duration/fast', resolvedType: 'FLOAT', value: 167 },
  { name: 'motion/duration/normal', resolvedType: 'FLOAT', value: 250 },
  { name: 'motion/duration/progress-ring', resolvedType: 'FLOAT', value: 2000 },
  { name: 'motion/easing/direct-entrance', resolvedType: 'EASING', value: null },
  { name: 'motion/easing/fade', resolvedType: 'EASING', value: null },
  { name: 'motion/scale/window-enter', resolvedType: 'FLOAT', value: 0.96 },
];

/**
 * 변수에 연결한 이징을 만든다.
 * @param name 변수 이름 끝(`direct-entrance`)
 * @returns 이징
 */
export function easing(name: string): EasingData {
  return { kind: 'variable', name: `motion/easing/${name}`, resolvedType: 'EASING' };
}

/** 변수에 연결하지 않은 곡선 이징(첫 키프레임처럼 쓰이지 않는 자리에 둔다) */
export const unbound: EasingData = { kind: 'unbound', description: 'EASE_OUT' };

/**
 * 키프레임을 만든다.
 * @param time 타임라인 위치(초)
 * @param value 값
 * @param keyframeEasing 이징
 * @returns 키프레임
 */
export function keyframe(
  time: number,
  value: KeyframeData['value'],
  keyframeEasing: EasingData = unbound,
): KeyframeData {
  return { time, value, easing: keyframeEasing };
}

/**
 * 트랙을 만든다.
 * @param property 항목 이름
 * @param keyframes 키프레임
 * @param overrides 바꿀 값
 * @returns 트랙
 */
export function track(
  property: string,
  keyframes: KeyframeData[],
  overrides: Partial<TrackData> = {},
): TrackData {
  return {
    node: 'Window',
    nodeKind: 'component',
    nodeId: '12:35',
    path: 'Window',
    property,
    operation: 'SET',
    keyframes,
    ...overrides,
  };
}

/**
 * 창 열기 견본(배율 0.96 → 1, 투명도 0 → 1, normal 250ms)을 만든다.
 * @returns 견본 데이터
 */
export function windowOpenSample(): MotionSampleData {
  return {
    name: 'motion-window-open',
    nodeId: '12:34',
    problems: [],
    tracks: [
      track('SCALE_XY', [
        keyframe(0, { x: 0.96, y: 0.96 }),
        keyframe(0.25, { x: 1, y: 1 }, easing('direct-entrance')),
      ]),
      track('OPACITY', [keyframe(0, 0), keyframe(0.25, 1, easing('fade'))]),
    ],
  };
}
