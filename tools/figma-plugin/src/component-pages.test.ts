import { describe, expect, it } from 'vitest';

import {
  type AncestorInfo,
  componentPlace,
  isCodeOnlyComponent,
  isComponentsPage,
  isDocComponent,
  UNGROUPED,
} from './component-pages';

/**
 * 섹션 조상을 만든다.
 * @param name 섹션 이름
 * @returns 조상
 */
function section(name: string): AncestorInfo {
  return { type: 'SECTION', name };
}

/**
 * 프레임 조상을 만든다.
 * @param name 프레임 이름
 * @returns 조상
 */
function frame(name: string): AncestorInfo {
  return { type: 'FRAME', name };
}

// @codocs [[피그마 연동:피그마 플러그인]]
describe('컴포넌트는 02 · Components 페이지의 묶음 섹션 > 컴포넌트 섹션으로 묶는다', () => {
  it('이름에 Components가 든 페이지가 컴포넌트 페이지다(번호가 바뀌어도 된다)', () => {
    expect(isComponentsPage('02 · Components')).toBe(true);
    expect(isComponentsPage('05 · Components')).toBe(true);
    expect(isComponentsPage('01 · Foundations')).toBe(false);
    expect(isComponentsPage('03 · Patterns')).toBe(false);
    expect(isComponentsPage('Button (버튼)')).toBe(false);
  });

  it('묶음은 페이지 바로 아래 섹션, 그룹은 그 안 섹션이다', () => {
    expect(
      componentPlace([section('Controls (컨트롤)'), section('Button (버튼)'), frame('component')]),
    ).toEqual({ band: 'Controls (컨트롤)', group: 'Button (버튼)' });
  });

  it('섹션 밖에 놓인 컴포넌트는 묶음 없이 묶음 밖이다', () => {
    expect(componentPlace([])).toEqual({ band: null, group: UNGROUPED });
    expect(componentPlace([frame('component'), section('Button (버튼)')])).toEqual({
      band: null,
      group: UNGROUPED,
    });
  });

  it('묶음 섹션 바로 안(컴포넌트 섹션 밖)에 놓인 컴포넌트는 그 묶음의 묶음 밖이다', () => {
    expect(componentPlace([section('Window (창)')])).toEqual({
      band: 'Window (창)',
      group: UNGROUPED,
    });
    expect(componentPlace([section('Window (창)'), frame('row'), section('Tab')])).toEqual({
      band: 'Window (창)',
      group: UNGROUPED,
    });
  });

  it('이름이 점으로 시작하는 문서용 컴포넌트는 내보내지 않는다', () => {
    expect(isDocComponent('.page_header')).toBe(true);
    expect(isDocComponent('.section_header')).toBe(true);
    expect(isDocComponent('Button')).toBe(false);
    expect(isDocComponent('Menu/.hidden')).toBe(false);
  });
});

// @codocs [[컴포넌트 목록:코드 전용 컴포넌트]]
describe('코드 전용 컴포넌트', () => {
  it('감싸기·배치용 컴포넌트는 내보내지 않는다', () => {
    expect(isCodeOnlyComponent('ScrollArea')).toBe(true);
    expect(isCodeOnlyComponent('MenuSeparator')).toBe(true);
    expect(isCodeOnlyComponent('Scrollbar')).toBe(false);
    expect(isCodeOnlyComponent('Separator')).toBe(false);
    expect(isCodeOnlyComponent('Equation')).toBe(false);
  });
});
