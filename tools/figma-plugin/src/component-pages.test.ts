import { describe, expect, it } from 'vitest';

import { componentPages, isDocComponent } from './component-pages';

const LEGACY = '1:2';

// @codocs [[피그마 연동:피그마 플러그인]]
describe('컴포넌트 페이지는 고정 페이지와 구분선 페이지를 뺀 모든 페이지다', () => {
  it('숫자로 시작하는 고정 페이지와 `-`로 시작하는 구분선 페이지를 빼고, 페이지마다 구분선 묶음 이름을 붙인다', () => {
    const pages = [
      { id: '0:1', name: '00 · Guide' },
      { id: '0:2', name: '01 · Foundations' },
      { id: '8:1', name: '- Controls (컨트롤)' },
      { id: '9:1', name: 'Button (버튼)' },
      { id: '9:2', name: 'Checkbox (체크 상자)' },
      { id: '8:2', name: '--  Window (창)' },
      { id: '9:4', name: 'Window (창)' },
      { id: '0:3', name: '03 · Patterns' },
      { id: '0:4', name: '04 · Screens' },
    ];
    expect(componentPages(pages, LEGACY).map((page) => [page.band, page.name])).toEqual([
      ['Controls (컨트롤)', 'Button (버튼)'],
      ['Controls (컨트롤)', 'Checkbox (체크 상자)'],
      ['Window (창)', 'Window (창)'],
    ]);
  });

  it('첫 구분선 앞의 페이지는 묶음이 없다', () => {
    const pages = [
      { id: '9:1', name: 'Button (버튼)' },
      { id: '8:1', name: '- Window (창)' },
      { id: '9:2', name: 'Window (창)' },
    ];
    expect(componentPages(pages, LEGACY).map((page) => page.band)).toEqual([null, 'Window (창)']);
  });

  it('한 페이지에 모든 컴포넌트를 두던 02 · Components 페이지도 읽는다', () => {
    const pages = [
      { id: '0:2', name: '01 · Foundations' },
      { id: LEGACY, name: '02 · Components' },
      { id: '0:3', name: '03 · Patterns' },
    ];
    expect(componentPages(pages, LEGACY).map((page) => page.id)).toEqual([LEGACY]);
  });

  it('`-`가 가운데 든 이름은 컴포넌트 페이지다', () => {
    const pages = [{ id: '4', name: 'Snap - 창 배치' }];
    expect(componentPages(pages, LEGACY).map((page) => page.id)).toEqual(['4']);
  });

  it('이름이 점으로 시작하는 문서용 컴포넌트는 내보내지 않는다', () => {
    expect(isDocComponent('.page_header')).toBe(true);
    expect(isDocComponent('.section_header')).toBe(true);
    expect(isDocComponent('Button')).toBe(false);
    expect(isDocComponent('Menu/.hidden')).toBe(false);
  });
});
