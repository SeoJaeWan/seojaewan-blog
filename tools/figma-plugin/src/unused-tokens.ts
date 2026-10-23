// 쓰는 곳이 없는 변수·스타일을 찾는다. 막지 않고 정리 알림으로만 보여 준다.
// 피그마 API 값을 옮겨 담은 순수 데이터로 계산한다. figma-reader.ts가 피그마에서 이 모양을 읽는다.

/** 변수 하나 */
export type UsageVariable = {
  id: string;
  name: string;
  /** 피그마 속성 선택 목록에 보이는 범위. 비어 있으면 코드에서만 쓰는 변수라 알리지 않는다 */
  scopes: readonly string[];
  /** 모든 모드의 값에서 이 변수가 가리키는 다른 변수 ID(별칭) */
  aliasIds: readonly string[];
};

/** 스타일 하나 */
export type UsageStyle = {
  id: string;
  name: string;
  kind: 'paint' | 'text' | 'effect';
  /** 이 스타일을 쓰는 노드 수 */
  consumerCount: number;
  /** 스타일 값에 연결된 변수 ID */
  variableIds: readonly string[];
};

export type UsageInput = {
  variables: readonly UsageVariable[];
  styles: readonly UsageStyle[];
  /** 노드(모든 페이지)에 연결된 변수 ID. 글자 구간의 연결도 넣는다 */
  nodeVariableIds: ReadonlySet<string>;
  /** 노드(모든 페이지)에 입힌 스타일 ID. 글자 일부 구간에만 입힌 스타일도 넣는다 */
  nodeStyleIds: ReadonlySet<string>;
};

const STYLE_KIND_LABEL = {
  paint: '칠 스타일',
  text: '글자 스타일',
  effect: '효과 스타일',
} as const;

/**
 * 쓰는 곳이 없는 변수와 스타일을 알림 문장으로 만든다.
 * - 스타일: 그 스타일을 쓰는 노드도, 입힌 글자 구간도 없으면 알린다.
 * - 변수: 노드나 쓰는 스타일이 직접 연결한 변수, 그리고 그 변수가 별칭으로 가리키는 변수(끝까지)를 쓴다고 본다.
 *   코드에서만 쓰는 변수(범위가 비어 있음)는 알리지 않는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param input 변수·스타일·노드 연결 정보
 * @returns 알림 문장(이름 순)
 */
export function unusedNotices(input: UsageInput): string[] {
  const usedStyles = input.styles.filter(
    (style) => style.consumerCount > 0 || input.nodeStyleIds.has(style.id),
  );
  const used = new Set<string>(input.nodeVariableIds);
  for (const style of usedStyles) {
    for (const id of style.variableIds) {
      used.add(id);
    }
  }
  const byId = new Map(input.variables.map((variable) => [variable.id, variable]));
  const queue = [...used];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const target of byId.get(id)?.aliasIds ?? []) {
      if (!used.has(target)) {
        used.add(target);
        queue.push(target);
      }
    }
  }
  const styleNotices = input.styles
    .filter((style) => !usedStyles.includes(style))
    .map((style) => `${STYLE_KIND_LABEL[style.kind]} ${style.name}: 쓰는 곳이 없다`);
  const variableNotices = input.variables
    .filter((variable) => variable.scopes.length > 0 && !used.has(variable.id))
    .map((variable) => `변수 ${variable.name}: 쓰는 곳이 없다`);
  return [...styleNotices.sort(), ...variableNotices.sort()];
}
