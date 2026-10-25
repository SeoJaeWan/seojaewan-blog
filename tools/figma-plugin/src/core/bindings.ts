// 노드의 변수 연결을 읽는 순수 규칙. read-node.ts가 피그마 API로 읽은 값을 넘긴다.

/** 필드 이름 → 연결한 변수 ID */
export type Bindings = Partial<Record<string, string>>;

/**
 * 인스턴스 교체 속성으로 바꿔 끼운 인스턴스의 변수 연결을 정한다.
 * 바꿔 끼운 인스턴스는 바꾸기 전 레이어(원본 컴포넌트 안의 레이어)의 크기 변수 연결을 그대로 쓰지만,
 * 피그마 API는 바꿔 끼운 인스턴스의 boundVariables에 그 연결을 돌려주지 않는다.
 * 그래서 자기 연결이 없는 필드는 원본 레이어의 연결을 물려받은 것으로 본다. 값이 원본과 다르면 덮어쓴 것이라 물려받지 않는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param own 노드 자신의 연결
 * @param inherited 원본 레이어의 연결
 * @param isSameValue 필드 값이 원본 레이어와 같은지
 * @returns 합친 연결
 */
export function inheritedBindings(
  own: Bindings,
  inherited: Bindings,
  isSameValue: (field: string) => boolean,
): Bindings {
  const result: Bindings = { ...own };
  for (const [field, id] of Object.entries(inherited)) {
    if (result[field] === undefined && id !== undefined && isSameValue(field)) {
      result[field] = id;
    }
  }
  return result;
}

/**
 * 인스턴스 안쪽 레이어 ID에서 원본 컴포넌트 안 레이어의 ID를 꺼낸다.
 * 인스턴스 안쪽 레이어 ID는 `I<인스턴스 ID>;<원본 레이어 ID>` 꼴이고, 겹친 인스턴스는 `;`로 더 이어진다.
 * @param id 노드 ID
 * @returns 원본 레이어 ID, 인스턴스 안쪽 레이어가 아니면 null
 */
export function sourceLayerId(id: string): string | null {
  const parts = id.split(';');
  return parts.length > 1 ? (parts.at(-1) ?? null) : null;
}

/**
 * 인스턴스가 덮어쓴 안쪽 레이어에 해당하는, 그 인스턴스의 원본 컴포넌트 안 레이어 ID를 구한다.
 * 안쪽 레이어 ID `I<인스턴스 ID>;<나머지>`(인스턴스 ID가 이미 `I`로 시작하면 `<인스턴스 ID>;<나머지>`)에서 인스턴스 ID를 떼면 원본 컴포넌트 기준 ID가 된다
 * (나머지가 `;`로 이어지면 원본 안 인스턴스의 안쪽 레이어라 앞에 `I`를 붙인다).
 * @codocs [[피그마 연동:구조 검사]]
 * @param instanceId 덮어쓴 인스턴스 ID
 * @param layerId 덮어쓴 레이어 ID
 * @returns 원본 컴포넌트 안 레이어 ID. 그 인스턴스 안쪽 레이어가 아니면 null
 */
export function overrideSourceId(instanceId: string, layerId: string): string | null {
  const prefix = instanceId.startsWith('I') ? `${instanceId};` : `I${instanceId};`;
  if (!layerId.startsWith(prefix)) {
    return null;
  }
  const rest = layerId.slice(prefix.length);
  return rest.includes(';') ? `I${rest}` : rest;
}
