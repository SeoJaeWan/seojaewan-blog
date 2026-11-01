// 노드에 변수를 연결할 수 없는 값(회전·최대 줄 수·비율)을 같은 값의 코드 전용 변수와 짝짓는다.
// 피그마 API를 쓰지 않는 순수 함수다. 규칙은 [[피그마 연동:구조 검사]]에 있다.

/** 코드 전용 변수 하나 */
export type CodeVariable = { name: string; value: number };

/** 짝짓는 묶음마다 변수. 묶음이 비어 있으면 아직 만들지 않은 것이라 그 묶음은 검사하지 않는다 */
export type CodeVariables = {
  rotate: readonly CodeVariable[];
  lineClamp: readonly CodeVariable[];
  ratio: readonly CodeVariable[];
};

/** 묶음마다 변수 이름 앞부분 */
export const CODE_VARIABLE_PREFIXES = {
  rotate: 'rotate/',
  lineClamp: 'line-clamp/',
  ratio: 'ratio/',
} as const;

export const noCodeVariables: CodeVariables = { rotate: [], lineClamp: [], ratio: [] };

// 값이 같다고 보는 차이다. 비율은 float32 저장 오차가 있다.
const VALUE_TOLERANCE = 1e-3;
const FULL_TURN = 360;

/**
 * 같은 값의 변수를 찾는다. 같은 값이 여럿이면 이름순 첫 변수다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param value 노드의 값
 * @param variables 묶음의 변수
 * @returns 변수 이름, 없으면 undefined
 */
export function pairedVariable(
  value: number,
  variables: readonly CodeVariable[],
): string | undefined {
  return variables
    .filter((variable) => Math.abs(variable.value - value) <= VALUE_TOLERANCE)
    .map((variable) => variable.name)
    .sort()[0];
}

/**
 * 피그마 회전을 CSS 각도(0 이상 360 미만)로 바꾼다. 피그마는 반시계 방향이 양수이고, `rotate/*` 변수는 CSS 값을 담는다.
 * @codocs [[피그마 연동:회전 구현]]
 * @param rotation 피그마 회전(도)
 * @returns CSS 각도
 */
export function cssAngle(rotation: number): number {
  return ((-rotation % FULL_TURN) + FULL_TURN) % FULL_TURN;
}
