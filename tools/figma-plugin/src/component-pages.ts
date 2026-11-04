// 피그마 파일의 페이지에서 컴포넌트 페이지를 고른다. 피그마 API를 모르는 순수 계산이다.

/** 페이지 이름과 ID */
export type PageInfo = { id: string; name: string };

/** 컴포넌트 페이지와 그 페이지가 든 구분선 묶음 */
export type ComponentPage = PageInfo & {
  /** 앞에 놓인 구분선 페이지의 묶음 이름(`- Controls (컨트롤)` → `Controls (컨트롤)`). 첫 구분선 앞이면 null */
  band: string | null;
};

/** 고정 페이지(`00 · Guide`, `01 · Foundations`, `03 · Patterns`, `04 · Screens`)는 이름이 숫자로 시작한다 */
const FIXED_PAGE_PATTERN = /^\d/u;
/** 묶음 사이 구분선 페이지는 이름이 `-`로 시작한다(`- Controls (컨트롤)`). 묶음 이름은 앞의 `-`와 공백을 뗀 글자다 */
const DIVIDER_PREFIX_PATTERN = /^[-\s]+/u;
/** 문서용 컴포넌트(`.page_header` 등)는 이름이 점으로 시작한다 */
const DOC_COMPONENT_PREFIX = '.';

/**
 * 컴포넌트 페이지를 문서 순서대로 고른다. 숫자로 시작하는 고정 페이지와 `-`로 시작하는 구분선 페이지를 뺀 모든 페이지이고,
 * 페이지마다 앞에 놓인 구분선 페이지의 묶음 이름을 붙인다.
 * 컴포넌트 페이지를 나누기 전의 `02 · Components` 페이지(`legacyPageId`)는 숫자로 시작해도 컴포넌트 페이지로 읽는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param pages 문서 순서의 페이지
 * @param legacyPageId 한 페이지에 모든 컴포넌트를 두던 `02 · Components` 페이지 ID
 * @returns 컴포넌트 페이지(문서 순서)
 */
export function componentPages(pages: readonly PageInfo[], legacyPageId: string): ComponentPage[] {
  const result: ComponentPage[] = [];
  let band: string | null = null;
  for (const page of pages) {
    const name = page.name.trim();
    if (page.id === legacyPageId) {
      result.push({ id: page.id, name: page.name, band });
    } else if (name.startsWith('-')) {
      band = name.replace(DIVIDER_PREFIX_PATTERN, '');
    } else if (!FIXED_PAGE_PATTERN.test(name)) {
      result.push({ id: page.id, name: page.name, band });
    }
  }
  return result;
}

/**
 * 내보내지 않는 문서용 컴포넌트인지 본다. 이름이 점으로 시작하는 컴포넌트는 피그마 라이브러리 게시에서도 숨는다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param name 컴포넌트(세트) 이름
 * @returns 문서용이면 true
 */
export function isDocComponent(name: string): boolean {
  return name.trimStart().startsWith(DOC_COMPONENT_PREFIX);
}
