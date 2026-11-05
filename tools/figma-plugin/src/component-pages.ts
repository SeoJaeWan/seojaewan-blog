// 피그마 파일에서 컴포넌트 페이지를 고르고 컴포넌트의 묶음을 정한다. 피그마 API를 모르는 순수 계산이다.

/** 컴포넌트의 조상 하나(페이지 바로 아래부터) */
export type AncestorInfo = { type: string; name: string };

/** 컴포넌트가 든 묶음 섹션과 컴포넌트 섹션. band는 묶음 섹션(`Controls (컨트롤)`), group은 컴포넌트 섹션(`Button (버튼)`) 이름 */
export type ComponentPlace = { band: string | null; group: string };

/** 섹션 밖에 놓인 컴포넌트, `영역/이름` 꼴이 아닌 조립의 묶음 이름 */
export const UNGROUPED = '묶음 밖';

/** 컴포넌트 페이지(`02 · Components`) 이름에 든 글자. 번호가 바뀌어도 찾도록 이름의 이 글자로 찾는다 */
const COMPONENTS_PAGE_KEYWORD = 'Components';
/** 문서용 컴포넌트(`.page_header` 등)는 이름이 점으로 시작한다 */
const DOC_COMPONENT_PREFIX = '.';

/**
 * 컴포넌트 페이지인지 본다. 이름에 `Components`가 든 페이지다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param name 페이지 이름
 * @returns 컴포넌트 페이지면 true
 */
export function isComponentsPage(name: string): boolean {
  return name.includes(COMPONENTS_PAGE_KEYWORD);
}

/**
 * 컴포넌트의 묶음을 조상으로 정한다. 묶음(band)은 페이지 바로 아래 섹션, 그룹(group)은 그 안 섹션이다.
 * 섹션 밖에 놓인 컴포넌트는 묶음 없이 `묶음 밖`이고, 묶음 섹션 바로 안(컴포넌트 섹션 밖)이면 그 묶음의 `묶음 밖`이다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param ancestors 컴포넌트(세트)의 조상. 페이지 바로 아래부터 가장 가까운 것까지이고 컴포넌트 자신은 넣지 않는다
 * @returns 묶음과 그룹 이름
 */
export function componentPlace(ancestors: readonly AncestorInfo[]): ComponentPlace {
  const [outer, inner] = ancestors;
  if (outer?.type !== 'SECTION') {
    return { band: null, group: UNGROUPED };
  }
  return { band: outer.name, group: inner?.type === 'SECTION' ? inner.name : UNGROUPED };
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
