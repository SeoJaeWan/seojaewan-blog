import { describe, expect, it } from 'vitest';

import {
  assetFile,
  assetFilePath,
  componentFilePath,
  componentSlug,
  patternFolder,
  patternPlace,
  variantSlug,
} from './naming';
import { utf8Encode } from './sha256';
import { utf8Decode } from './svg-normalize';
import { monoColorSvg } from './svg-normalize';

// @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
describe('이미지 파일 이름은 피그마 변형 이름과 1:1로 맞춘다', () => {
  it('컴포넌트 폴더 이름은 컴포넌트 이름의 kebab-case다', () => {
    expect(componentSlug('TaskbarPreviewList')).toBe('taskbar-preview-list');
    expect(componentSlug('SnapLayoutFlyout')).toBe('snap-layout-flyout');
    expect(componentSlug('Button')).toBe('button');
  });

  it('연속한 대문자와 공백도 단어로 나눈다', () => {
    expect(componentSlug('URLField')).toBe('url-field');
    expect(componentSlug('Menu Separator')).toBe('menu-separator');
  });

  it('변형 파일 이름은 피그마 속성 순서대로 prop=value를 쉼표로 잇고 소문자로 쓴다', () => {
    expect(variantSlug({ Variant: 'Accent', State: 'Rest' })).toBe('variant=accent,state=rest');
    expect(variantSlug({ State: 'Rest', Variant: 'Accent' })).toBe('state=rest,variant=accent');
  });

  it('공백과 [a-z0-9-] 밖의 문자는 -로 바꾸고 겹친 -를 합치며 양끝 -를 없앤다', () => {
    expect(variantSlug({ 'Title bar': 'Default', View: 'Large icon' })).toBe(
      'title-bar=default,view=large-icon',
    );
    expect(variantSlug({ 'Power menu': '(Open) / Hover' })).toBe('power-menu=open-hover');
    expect(variantSlug({ Size: '16' })).toBe('size=16');
  });

  it('단독 컴포넌트의 변형 파일 이름은 default다', () => {
    expect(variantSlug({})).toBe('default');
  });

  it('이름을 만들 수 없는 속성이면 중단한다', () => {
    expect(() => variantSlug({ '!!': 'A' })).toThrow();
  });

  it('컴포넌트 파일은 packages/design-system/figma/components/<컴포넌트>/ 아래에 둔다', () => {
    expect(componentFilePath('button', 'variant=accent,state=rest.png')).toBe(
      'packages/design-system/figma/components/button/variant=accent,state=rest.png',
    );
    expect(componentFilePath('button', 'export.json')).toBe(
      'packages/design-system/figma/components/button/export.json',
    );
  });
});

// @codocs [[피그마 연동:자산]]
describe('자산 파일', () => {
  it('자산은 figma/assets/<묶음>/<이름>에 두고, 래스터만 PNG다', () => {
    expect(assetFile({ group: 'Icons', name: 'ic_fluent_add_20_regular', kind: 'mono' })).toBe(
      'icons/ic_fluent_add_20_regular.svg',
    );
    expect(assetFile({ group: 'Illustrations', name: 'file/Folder', kind: 'color' })).toBe(
      'illustrations/file-folder.svg',
    );
    expect(assetFile({ group: 'Images', name: 'avatar/Profile', kind: 'raster' })).toBe(
      'images/avatar-profile.png',
    );
    expect(assetFilePath('icons/a.svg')).toBe('packages/design-system/figma/assets/icons/a.svg');
  });

  it('한 가지 색 자산 SVG의 색은 currentColor가 되고 색 불투명도는 지운다', () => {
    const svg = '<svg><path fill="#242424" fill-opacity="0.6" d="M0"/><rect fill="none"/></svg>';
    expect(utf8Decode(monoColorSvg(utf8Encode(svg)))).toBe(
      '<svg><path fill="currentColor" d="M0"/><rect fill="none"/></svg>',
    );
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('조립 폴더', () => {
  it('조립 이름 `영역/이름`을 apps/web/figma/patterns/<영역>/<이름>으로 둔다', () => {
    const place = patternPlace('Menu/ViewSubmenu');
    expect(place).toEqual({ area: 'menu', name: 'view-submenu' });
    expect(place === null ? null : patternFolder(place)).toBe(
      'apps/web/figma/patterns/menu/view-submenu',
    );
  });

  it('`영역/이름` 꼴이 아닌 이름은 폴더를 정할 수 없다', () => {
    expect(patternPlace('Folder')).toBeNull();
    expect(patternPlace('Menu/Folder/Open')).toBeNull();
    expect(patternPlace('Menu/')).toBeNull();
  });
});
