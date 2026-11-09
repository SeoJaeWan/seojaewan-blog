/**
 * 코드 전용 컴포넌트(감싸기·배치용)의 컴포넌트 폴더 이름. 피그마 그림이 없어 캡처 표에서 빠지고 동작 테스트로 지킨다.
 * 피그마에서 지우고 내보낸 폴더를 정리하기 전까지 `figma/components/`에 폴더가 남아 있어도 캡처하지 않는다.
 * 목록의 기준은 [[컴포넌트 목록:코드 전용 컴포넌트]]이다.
 */
const codeOnlyFolders: ReadonlySet<string> = new Set([
  'layer-surface',
  'scroll-area',
  'tile-grid',
  'column',
  'columns',
  'list-group',
  'popover',
  'caption-button-group',
  'menu-separator',
]);

/**
 * 컴포넌트 폴더가 코드 전용 컴포넌트인지 본다.
 * @codocs [[컴포넌트 목록:코드 전용 컴포넌트]]
 * @codocs [[피그마 연동:캡처 표]]
 * @param folder 컴포넌트 폴더 이름(`scroll-area`)
 * @returns 코드 전용이면 true
 */
export function isCodeOnlyComponent(folder: string): boolean {
  return codeOnlyFolders.has(folder);
}
