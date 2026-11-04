const MAX_TEXT_LENGTH = 300;
const DETAIL_KEYS = ['status', 'statusText', 'type', 'code', 'name'] as const;
// GitHub 토큰 모양(fine-grained, classic, Bearer 헤더 값)은 오류 문장에 남기지 않는다.
const TOKEN_PATTERN = /github_pat_\w+|gh[pousr]_\w+|Bearer\s+\S+/g;

/**
 * 오류를 사람이 읽는 문장으로 바꾼다. Error가 아닌 값(피그마 fetch가 거부한 객체 등)도 읽을 수 있게 하고,
 * 토큰 모양의 글자는 가린다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param error 던져진 값
 * @returns 오류 문장
 */
export function describeError(error: unknown): string {
  const text = error instanceof Error ? error.message : describeValue(error);
  return cut(text.replace(TOKEN_PATTERN, '***'));
}

/**
 * Error가 아닌 값을 문장으로 바꾼다. 객체는 `message`와 `status`·`type` 같은 필드를, 없으면 JSON 요약을 쓴다.
 * @param value 던져진 값
 * @returns 문장
 */
function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  const message: unknown = Reflect.get(value, 'message');
  const details: string[] = [];
  for (const key of DETAIL_KEYS) {
    const field: unknown = Reflect.get(value, key);
    if (typeof field === 'string' || typeof field === 'number') {
      details.push(`${key}=${String(field)}`);
    }
  }
  if (typeof message === 'string' && message !== '') {
    return details.length === 0 ? message : `${message} (${details.join(', ')})`;
  }
  try {
    const json = JSON.stringify(value);
    if (json !== '{}') {
      return json;
    }
  } catch {
    // 순환 참조 등은 아래의 이름으로 대신한다.
  }
  return details.length === 0 ? '알 수 없는 오류(내용 없는 객체)' : details.join(', ');
}

/**
 * 너무 긴 문장을 줄인다.
 * @param text 문장
 * @returns 줄인 문장
 */
function cut(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}
