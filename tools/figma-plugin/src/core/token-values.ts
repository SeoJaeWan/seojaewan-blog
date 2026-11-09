import type { TokenValue } from './pattern-report';

// 조립 보고가 가까운 토큰을 찾는 데 쓰는 Foundations 변수 값을 읽는다. 노드를 바꾸지 않는다(읽기 전용).

// 별칭을 따라가는 최대 단계다.
const MAX_ALIAS_DEPTH = 10;

/**
 * 숫자(FLOAT)·색(COLOR) 로컬 변수의 기본 모드 값을 별칭까지 풀어 읽는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @returns 변수 이름과 값
 */
export async function readTokenValues(): Promise<TokenValue[]> {
  const collections = new Map(
    (await figma.variables.getLocalVariableCollectionsAsync()).map((collection) => [
      collection.id,
      collection,
    ]),
  );
  const result: TokenValue[] = [];
  for (const variable of await figma.variables.getLocalVariablesAsync()) {
    if (variable.resolvedType !== 'FLOAT' && variable.resolvedType !== 'COLOR') {
      continue;
    }
    const value = await defaultValue(variable, collections);
    if (variable.resolvedType === 'FLOAT' && typeof value === 'number') {
      result.push({ name: variable.name, kind: 'number', value });
    } else if (typeof value === 'object' && value !== null && 'r' in value) {
      result.push({
        name: variable.name,
        kind: 'color',
        value: { r: value.r, g: value.g, b: value.b, a: 'a' in value ? value.a : 1 },
      });
    }
  }
  return result;
}

/**
 * 변수의 기본 모드 값을 별칭까지 풀어 읽는다.
 * @param variable 변수
 * @param collections 컬렉션 ID → 컬렉션
 * @returns 값, 풀지 못하면 null
 */
async function defaultValue(
  variable: Variable,
  collections: ReadonlyMap<string, VariableCollection>,
): Promise<VariableValue | null> {
  let current: Variable | null = variable;
  for (let depth = 0; depth < MAX_ALIAS_DEPTH && current !== null; depth += 1) {
    const collection = collections.get(current.variableCollectionId);
    const modeId = collection?.defaultModeId ?? Object.keys(current.valuesByMode)[0];
    const value = modeId === undefined ? undefined : current.valuesByMode[modeId];
    if (value === undefined) {
      return null;
    }
    if (typeof value !== 'object' || !('type' in value) || value.type !== 'VARIABLE_ALIAS') {
      return value;
    }
    current = await figma.variables.getVariableByIdAsync(value.id);
  }
  return null;
}
