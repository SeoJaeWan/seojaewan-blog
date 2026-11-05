import type { Directives } from './directives';

// 모션 견본에서 읽은 순수 데이터. read-motion.ts가 피그마 API로 채우고, 모션 검사(check-motion.ts)는 이 데이터만 쓴다.
// 피그마 API 없이 테스트할 수 있게 하기 위해서다.

/** 키프레임 값. 숫자 항목은 숫자, 벡터는 `{ x, y }`, 색은 `{ r, g, b, a }`이고 나머지는 피그마 값 그대로다 */
export type MotionValue =
  | number
  | boolean
  | string
  | { x: number; y: number }
  | { r: number; g: number; b: number; a: number }
  | { [key: string]: number };

/** 키프레임 이징 */
export type EasingData =
  /** 변수에 연결한 이징. `resolvedType`은 변수 종류(`EASING`이어야 한다) */
  | { kind: 'variable'; name: string; resolvedType: string }
  /** 변수에 연결했지만 변수를 찾지 못함(지운 변수, 라이브러리 변수) */
  | { kind: 'missing-variable'; id: string }
  /** 변수에 연결하지 않은 곡선. `description`은 메시지에 쓰는 곡선 설명 */
  | { kind: 'unbound'; description: string }
  /** 키프레임을 정의한 곳을 찾지 못해 연결을 알 수 없음 */
  | { kind: 'unknown' };

/**
 * 키프레임 하나.
 * - time: 타임라인 위치(초)
 * - easing: 이전 키프레임에서 이 키프레임까지 움직이는 이징(피그마 규칙). 첫 키프레임의 이징은 쓰이지 않는다
 */
export type KeyframeData = {
  time: number;
  value: MotionValue;
  easing: EasingData;
};

/** 키프레임이 걸린 노드가 무엇인지 */
export type MotionNodeKind =
  /** 견본에 놓은 컴포넌트 인스턴스. 이름은 컴포넌트(세트) 이름 */
  | 'component'
  /** Foundations 자산 원본에서 이어진 키프레임. 이름은 자산 이름(`progress-ring/Arc`) */
  | 'asset'
  /** 그 밖의 레이어. 이름은 레이어 이름 */
  | 'layer';

/**
 * 노드 하나의 항목 하나에 걸린 키프레임 트랙.
 * - node: 노드 이름(컴포넌트·자산·레이어 이름)
 * - nodeId: 키프레임이 걸린 피그마 노드 ID
 * - path: 견본 기준 레이어 경로(`ProgressRing / Arc`)
 * - property: 피그마 항목 이름(`ROTATION`, `SCALE_XY`, `fills[0]`, `effects[0].RADIUS`)
 * - operation: 피그마 트랙 연산(`SET`, `OFFSET`, `SCALE`)
 * - keyframes: 시간순 키프레임
 */
export type TrackData = {
  node: string;
  nodeKind: MotionNodeKind;
  nodeId: string;
  path: string;
  property: string;
  operation: string;
  keyframes: KeyframeData[];
};

/**
 * 읽는 중에 알게 된, 내보낼 수 없는 문제.
 * - path: 견본 기준 레이어 경로와 항목
 * - nodeId: 문제가 있는 피그마 노드 ID
 */
export type ReadProblem = {
  path: string;
  nodeId: string;
  reason: string;
  fix: string;
};

/**
 * 모션 견본 하나.
 * - name: 견본 프레임 이름(모션 클래스 이름)
 * - annotations: 견본 프레임 주석의 글
 * - lengthMs: 견본 타임라인 길이(ms). 읽지 못했으면 null
 */
export type MotionSampleData = {
  name: string;
  nodeId: string;
  tracks: TrackData[];
  problems: ReadProblem[];
  annotations: string[];
  lengthMs: number | null;
};

/**
 * `motion/*` 변수 하나.
 * - resolvedType: 변수 종류(`FLOAT`, `EASING` 등)
 * - value: FLOAT 변수의 값(별칭을 푼 기본 모드 값). FLOAT가 아니거나 읽지 못했으면 null
 * - curve: EASING 변수의 곡선 네 점
 */
export type MotionVariable = {
  name: string;
  resolvedType: string;
  value: number | null;
  curve?: readonly number[] | null;
};

export type { Directives };
