import { describe, expect, it } from 'vitest';

import { componentSlug, imagePath, variantSlug } from './naming';

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

  it('이미지 경로는 packages/design-system/figma/images/<컴포넌트>/<변형>.png다', () => {
    expect(imagePath('button', 'variant=accent,state=rest')).toBe(
      'packages/design-system/figma/images/button/variant=accent,state=rest.png',
    );
  });
});
