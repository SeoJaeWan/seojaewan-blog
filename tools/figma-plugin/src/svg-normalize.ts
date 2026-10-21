import { utf8Encode } from './sha256';

// 피그마가 내보낸 SVG의 내부 id를 내용만으로 정해지는 이름으로 바꾼다.
// 피그마는 마스크·클립 id에 노드 ID를 넣어(`clip0_14_106`) 같은 모양도 노드마다 파일 내용이 달라진다.

/**
 * SVG 안의 id를 나오는 순서대로 `s1`, `s2`…로 바꾸고, 그 id를 가리키는 `url(#…)`·`href="#…"`도 함께 바꾼다.
 * @codocs [[피그마 일치 검사:export.json 계약]]
 * @param svg SVG 문자열
 * @returns id를 바꾼 SVG 문자열
 */
export function normalizeSvgIds(svg: string): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1] ?? '');
  const renamed = new Map(ids.map((id, index) => [id, `s${index + 1}`]));
  return svg
    .replace(/(\sid=")([^"]+)(")/gu, (all, start: string, id: string, end: string) => {
      const next = renamed.get(id);
      return next === undefined ? all : `${start}${next}${end}`;
    })
    .replace(/url\(#([^)]+)\)/gu, (all, id: string) => {
      const next = renamed.get(id);
      return next === undefined ? all : `url(#${next})`;
    })
    .replace(/(href=")#([^"]+)(")/gu, (all, start: string, id: string, end: string) => {
      const next = renamed.get(id);
      return next === undefined ? all : `${start}#${next}${end}`;
    });
}

/**
 * UTF-8 바이트를 문자열로 바꾼다. 피그마 플러그인 샌드박스에 TextDecoder가 없을 수 있어 직접 푼다.
 * @param bytes UTF-8 바이트
 * @returns 문자열
 */
export function utf8Decode(bytes: Uint8Array): string {
  let escaped = '';
  for (const byte of bytes) {
    escaped += `%${byte.toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(escaped);
}

/**
 * SVG 바이트의 id를 바꾼 UTF-8 바이트를 만든다.
 * @param bytes 피그마가 내보낸 SVG 바이트
 * @returns id를 바꾼 SVG 바이트
 */
export function normalizeSvgBytes(bytes: Uint8Array): Uint8Array {
  return utf8Encode(normalizeSvgIds(utf8Decode(bytes)));
}

/**
 * 한 가지 색 자산 SVG의 칠·선 색을 currentColor로 바꾸고 색 불투명도 속성을 지운다(D6).
 * 색과 투명도는 코드의 글자 색 클래스(색 토큰)가 정한다. 색 토큰의 투명도가 SVG에 한 번 더 곱해지지 않게 불투명도도 지운다.
 * `fill="none"`처럼 칠하지 않는 값은 그대로 둔다.
 * @codocs [[피그마 일치 검사:자산]]
 * @param bytes SVG 바이트
 * @returns 바꾼 SVG 바이트
 */
export function monoColorSvg(bytes: Uint8Array): Uint8Array {
  const svg = utf8Decode(bytes)
    .replace(/\s(fill|stroke)="(?!none")[^"]*"/gu, ' $1="currentColor"')
    .replace(/\s(fill|stroke)-opacity="[^"]*"/gu, '');
  return utf8Encode(svg);
}
