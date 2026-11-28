import { ASSETS_DIR, COMPONENTS_DIR, FILE_KEY } from './plugin-config';

// 피그마 이름에서 저장소의 파일 이름과 피그마 링크를 만드는 순수 계산이다.

/**
 * 컴포넌트(세트) 이름을 컴포넌트 폴더 이름(kebab-case)으로 바꾼다.
 * 예: `TaskbarPreviewList` → `taskbar-preview-list`
 * @codocs [[코드 작성 규칙:파일과 폴더 이름]]
 * @codocs [[디자인 시스템:스키마]]
 * @param name 피그마 컴포넌트(세트) 이름
 * @returns kebab-case 폴더 이름
 */
export function componentSlug(name: string): string {
  const separated = name
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1-$2');
  return requireSlug(slugPart(separated), name);
}

/**
 * 컴포넌트 스키마 파일의 저장소 경로를 만든다(`src/components/<이름>/<이름>.json`).
 * @codocs [[디자인 시스템:스키마]]
 * @param slug 컴포넌트 폴더 이름
 * @returns 저장소 루트 기준 경로
 */
export function componentSchemaPath(slug: string): string {
  return `${COMPONENTS_DIR}/${slug}/${slug}.json`;
}

/**
 * 컴포넌트 검증 자료 파일의 저장소 경로를 만든다(`src/components/<이름>/<이름>.layout.json`).
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param slug 컴포넌트 폴더 이름
 * @returns 저장소 루트 기준 경로
 */
export function componentLayoutPath(slug: string): string {
  return `${COMPONENTS_DIR}/${slug}/${slug}.layout.json`;
}

/**
 * 피그마 노드로 가는 링크를 만든다. 노드 ID의 `:`는 주소에서 `-`로 쓴다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @param nodeId 피그마 노드 ID
 * @returns 피그마 파일의 그 노드 주소
 */
export function figmaNodeUrl(nodeId: string): string {
  return `https://www.figma.com/design/${FILE_KEY}/?node-id=${nodeId.replaceAll(':', '-')}`;
}

/**
 * 소문자로 바꾸고 `[a-z0-9-]` 밖의 문자(공백 포함)를 `-`로 바꾼 뒤, 겹친 `-`를 합치고 양끝 `-`를 없앤다.
 * @param text 바꿀 문자열
 * @returns 정리한 문자열
 */
function slugPart(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
}

/**
 * 정리한 결과가 비어 있으면 이름을 만들 수 없으므로 중단한다.
 * @param slug 정리한 문자열
 * @param original 원래 이름(오류 메시지용)
 * @returns 비어 있지 않은 slug
 */
function requireSlug(slug: string, original: string): string {
  if (slug === '') {
    throw new Error(`"${original}"에서 파일 이름을 만들 수 없다. 영문이나 숫자를 넣어야 한다.`);
  }
  return slug;
}

/**
 * 자산 컴포넌트 이름이나 묶음 이름을 파일 이름 조각으로 바꾼다.
 * 소문자로 바꾸고 `[a-z0-9_-]` 밖의 문자를 `-`로 바꾼다. 예: `ic_fluent_search_16_regular`는 그대로, `Icons`는 `icons`
 * @codocs [[디자인 시스템:자산]]
 * @param name 자산 컴포넌트 이름이나 묶음 이름
 * @returns 파일 이름 조각
 */
export function assetSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
  return requireSlug(slug, name);
}

/**
 * 자산 이름(`<묶음>/<자산>`)을 만든다. 확장자는 넣지 않는다. 스키마의 `AssetRef.file`이고 코드가 이 이름으로 자산을 찾는다.
 * @codocs [[디자인 시스템:자산]]
 * @param asset 자산 묶음과 이름
 * @param asset.group 묶음 이름
 * @param asset.name 자산 컴포넌트 이름
 * @returns 자산 폴더 기준 이름(예: `images/avatar-profile`)
 */
export function assetName(asset: { group: string; name: string }): string {
  return `${assetSlug(asset.group)}/${assetSlug(asset.name)}`;
}

/**
 * 자산 파일 이름(`<묶음>/<자산>.<확장자>`)을 만든다. 벡터 자산은 SVG, 래스터 자산은 내보낸 바이트의 실제 형식이다.
 * @codocs [[디자인 시스템:자산]]
 * @param name 자산 이름(`assetName`)
 * @param extension 확장자(`svg`, `png`, `jpg` 등)
 * @returns 자산 폴더 기준 파일 경로
 */
export function assetFile(name: string, extension: string): string {
  return `${name}.${extension}`;
}

/**
 * 자산 파일의 저장소 경로를 만든다.
 * @codocs [[디자인 시스템:스키마]]
 * @param file 자산 폴더 기준 파일 경로
 * @returns 저장소 루트 기준 경로
 */
export function assetFilePath(file: string): string {
  return `${ASSETS_DIR}/${file}`;
}
