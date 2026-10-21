/** JSON으로 쓸 수 있는 값 */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

/** JSON 객체 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * 객체 키를 알파벳 순으로 정렬해 2칸 들여쓴 JSON 문자열로 만든다. 끝에 줄바꿈을 붙인다.
 * 내보낼 때마다 키 순서가 같아야 diff가 안정적이다.
 * @param value 직렬화할 값
 * @returns 정렬한 JSON 문자열
 */
export function stableStringify(value: JsonValue): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

/**
 * 객체 키를 재귀적으로 정렬한다. 배열 순서는 그대로 둔다.
 * @param value 정렬할 값
 * @returns 키를 정렬한 새 값
 */
function sortKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: JsonObject = {};
    for (const key of Object.keys(value).sort(compareKeys)) {
      const child = value[key];
      if (child !== undefined) {
        sorted[key] = sortKeys(child);
      }
    }
    return sorted;
  }
  return value;
}

/**
 * 로케일과 상관없이 UTF-16 코드 단위 순서로 비교한다.
 * @param left 왼쪽 키
 * @param right 오른쪽 키
 * @returns 정렬 순서
 */
function compareKeys(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}
