import { COMPONENTS_DIR } from './plugin-config';

/** 단독 컴포넌트(변형 없음)의 변형 이름 */
export const DEFAULT_VARIANT = 'default';

/**
 * 컴포넌트(세트) 이름을 이미지 폴더 이름(kebab-case)으로 바꾼다.
 * 예: `TaskbarPreviewList` → `taskbar-preview-list`
 * @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
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
 * 변형 속성을 피그마가 준 순서대로 `prop=value`로 이어 이미지 파일 이름(확장자 제외)을 만든다.
 * 속성이 없으면(단독 컴포넌트) `default`다.
 * 예: `Variant=Accent, State=Rest` → `variant=accent,state=rest`
 * @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
 * @param properties 변형 속성 이름과 값(피그마 순서)
 * @returns 변형 파일 이름(확장자 제외)
 */
export function variantSlug(properties: Readonly<Record<string, string>>): string {
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return DEFAULT_VARIANT;
  }
  return entries
    .map(
      ([prop, value]) =>
        `${requireSlug(slugPart(prop), prop)}=${requireSlug(slugPart(value), value)}`,
    )
    .join(',');
}

/**
 * 컴포넌트 폴더 안 파일의 저장소 경로를 만든다.
 * @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
 * @param component 컴포넌트 폴더 이름
 * @param file 폴더 안 파일 이름(예: `variant=accent,state=rest.png`, `export.json`)
 * @returns 저장소 루트 기준 경로
 */
export function componentFilePath(component: string, file: string): string {
  return `${COMPONENTS_DIR}/${component}/${file}`;
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
