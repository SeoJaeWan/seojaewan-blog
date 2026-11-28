// 피그마 레이어를 가리키는 키(레이어 경로)의 규칙이다. 스키마(`<이름>.json`)의 레이어, 검증 자료(`<이름>.layout.json`)의
// 레이어, 생성기가 내는 레이어 짝 표가 모두 이 키로 이어진다. 플러그인과 생성 스크립트(Node가 바로 실행한다)가 함께 쓰므로
// 이 파일은 아무것도 import하지 않는다.

/**
 * 레이어 경로. 변형 루트에서 그 레이어까지 마디를 `/`로 이은 것이고 루트는 빈 문자열이다.
 * - 마디는 레이어 이름이다. 이름 안의 `\`, `/`, `[`는 앞에 `\`를 붙여 적는다(`progress-ring/Arc` → `progress-ring\/Arc`).
 * - 형제 가운데 같은 이름이 앞에 있으면 몇 번째인지를 `[n]`으로 붙인다(1부터 센다). 첫 번째는 붙이지 않는다(`item`, `item[2]`).
 * - 형제는 피그마 `children` 순서로 세고, 숨긴 레이어도 센다. 그래서 변형마다 보이는 레이어가 달라도 같은 레이어는 같은 키다.
 * - 인스턴스 안쪽 레이어는 인스턴스의 키 뒤에 원본 컴포넌트 안의 경로를 잇는다(`footer/primary button/label`). 자산 안쪽은 키를 두지 않는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:구조 검사]]
 */
export type LayerKey = string;

/** 변형 루트의 레이어 키 */
export const ROOT_LAYER_KEY = '';

/**
 * 레이어 키 마디 하나를 읽은 것.
 * - name: 이스케이프를 푼 레이어 이름
 * - occurrence: 같은 이름 형제 가운데 몇 번째인지(1부터)
 */
export type LayerKeySegment = { name: string; occurrence: number };

/**
 * 형제 레이어 이름 목록(피그마 `children` 순서, 숨긴 레이어 포함)에서 형제마다 레이어 키를 만든다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param parentKey 부모 레이어 키. 변형 루트의 자식이면 `ROOT_LAYER_KEY`
 * @param names 형제 레이어 이름. 피그마 `children` 순서다
 * @returns 이름과 같은 순서의 레이어 키
 */
export function childLayerKeys(parentKey: LayerKey, names: readonly string[]): LayerKey[] {
  const seen = new Map<string, number>();
  return names.map(
    /**
     * 형제 하나의 키를 만든다. 앞에서 같은 이름을 몇 번 만났는지 센다.
     * @param name 레이어 이름
     * @returns 레이어 키
     */
    (name) => {
      const occurrence = (seen.get(name) ?? 0) + 1;
      seen.set(name, occurrence);
      return joinLayerKey(parentKey, layerKeySegment({ name, occurrence }));
    },
  );
}

/**
 * 레이어 키 마디 하나를 만든다.
 * @param segment 레이어 이름과 같은 이름 형제 가운데 몇 번째인지
 * @returns 이스케이프하고 순번을 붙인 마디
 */
export function layerKeySegment(segment: LayerKeySegment): string {
  const escaped = segment.name.replace(/[\\/[]/gu, (character) => `\\${character}`);
  return segment.occurrence === 1 ? escaped : `${escaped}[${String(segment.occurrence)}]`;
}

/**
 * 부모 키 뒤에 마디를 잇는다. 인스턴스 키 뒤에 원본 컴포넌트 안의 키를 이을 때도 쓴다.
 * @param parentKey 부모 레이어 키
 * @param childKey 이을 마디나 키
 * @returns 이은 레이어 키
 */
export function joinLayerKey(parentKey: LayerKey, childKey: LayerKey): LayerKey {
  if (parentKey === ROOT_LAYER_KEY) {
    return childKey;
  }
  return childKey === ROOT_LAYER_KEY ? parentKey : `${parentKey}/${childKey}`;
}

/**
 * 레이어 키를 마디로 나눈다. 루트 키는 빈 목록이다.
 * @param key 레이어 키
 * @returns 루트에서부터의 마디
 */
export function parseLayerKey(key: LayerKey): LayerKeySegment[] {
  if (key === ROOT_LAYER_KEY) {
    return [];
  }
  const segments: LayerKeySegment[] = [];
  let name = '';
  let occurrence = '';
  let isInOccurrence = false;
  let isEscaped = false;
  for (const character of key) {
    if (isEscaped) {
      name += character;
      isEscaped = false;
    } else if (character === '\\') {
      isEscaped = true;
    } else if (character === '/') {
      segments.push(segmentOf(name, occurrence));
      name = '';
      occurrence = '';
      isInOccurrence = false;
    } else if (character === '[') {
      isInOccurrence = true;
    } else if (isInOccurrence) {
      if (character !== ']') {
        occurrence += character;
      }
    } else {
      name += character;
    }
  }
  segments.push(segmentOf(name, occurrence));
  return segments;
}

/**
 * 읽은 이름과 순번 글자로 마디를 만든다.
 * @param name 이스케이프를 푼 이름
 * @param occurrence `[n]`의 n. 없으면 빈 문자열
 * @returns 마디
 */
function segmentOf(name: string, occurrence: string): LayerKeySegment {
  return { name, occurrence: occurrence === '' ? 1 : Number(occurrence) };
}
