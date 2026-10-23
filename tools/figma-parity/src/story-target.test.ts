import { describe, expect, it } from 'vitest';

import { manifestFixture, storybookIndexFixture } from './story-target.fixture.ts';
import { camelCase, findStoryId, storyArgsParam, storyTarget } from './story-target.ts';
import { parseManifest, variantFileName } from './variant-name.ts';

// @codocs [[피그마 연동:스토리 규칙]]
describe('스토리 규칙', () => {
  it('피그마 속성 이름은 camelCase arg 이름이 된다', () => {
    expect(camelCase('Style')).toBe('style');
    expect(camelCase('Show Icon')).toBe('showIcon');
  });

  it('피그마 속성 값은 변형 파일 이름과 같은 규칙으로 정규화한 문자열이 된다', () => {
    expect(storyTarget([['Device', 'Chrome more (Mobile)']]).args).toEqual({
      device: 'chrome-more-mobile',
    });
  });

  it('True·False 값은 boolean arg가 된다', () => {
    expect(storyTarget([['Selected', 'True']]).args).toEqual({ selected: true });
    expect(storyArgsParam({ selected: true, style: 'accent' })).toBe('selected:!true;style:accent');
  });

  it('State가 Hover·Pressed·Focused면 실제 마우스·키보드로 재현하고 state arg도 넘긴다', () => {
    expect(storyTarget([['State', 'Hover']])).toEqual({
      args: { state: 'hover' },
      interaction: 'hover',
    });
    expect(storyTarget([['State', 'Pressed']]).interaction).toBe('pressed');
    expect(storyTarget([['State', 'Focused']]).interaction).toBe('focus');
  });

  it('나머지 상태는 상호작용 없이 args로만 재현한다', () => {
    expect(storyTarget([['State', 'Disabled']])).toEqual({
      args: { state: 'disabled' },
      interaction: 'none',
    });
  });

  it('컴포넌트는 그 컴포넌트 스토리 파일의 Parity 스토리와 짝짓는다', () => {
    expect(
      findStoryId(storybookIndexFixture, { id: 'button', kind: 'component', name: 'Button' }),
    ).toEqual({ ok: true, id: 'components-button--parity' });
    expect(
      findStoryId(storybookIndexFixture, { id: 'menu-item', kind: 'component', name: 'MenuItem' }),
    ).toMatchObject({ ok: false });
  });

  it('조립은 제목이 Patterns/ + 피그마 조립 이름인 스토리와 짝짓는다', () => {
    expect(
      findStoryId(storybookIndexFixture, {
        id: 'patterns/menu/folder',
        kind: 'pattern',
        name: 'Menu/Folder',
      }),
    ).toEqual({ ok: true, id: 'patterns-menu-folder--default' });
  });

  it('조립 제목의 스토리가 여럿이면 Parity 스토리를 쓴다', () => {
    expect(
      findStoryId(storybookIndexFixture, {
        id: 'patterns/start/power-button',
        kind: 'pattern',
        name: 'Start/PowerButton',
      }),
    ).toEqual({ ok: true, id: 'patterns-start-power-button--parity' });
  });

  it('짝 스토리가 없으면 만들 스토리를 알려 준다', () => {
    expect(
      findStoryId(storybookIndexFixture, {
        id: 'patterns/menu/view',
        kind: 'pattern',
        name: 'Menu/View',
      }),
    ).toEqual({
      ok: false,
      message: '스토리가 없다: 앱 Storybook에 제목이 "Patterns/Menu/View"인 스토리를 만든다',
    });
  });
});

// @codocs [[피그마 연동:피그마 플러그인]]
describe('export.json', () => {
  it('변형 파일 이름은 피그마 순서의 prop=value를 쉼표로 잇고, 속성이 없으면 default다', () => {
    expect(
      variantFileName([
        ['Style', 'Accent'],
        ['State', 'Rest'],
      ]),
    ).toBe('style=accent,state=rest');
    expect(variantFileName([])).toBe('default');
  });

  it('이름과 변형 목록을 읽고, 이름순으로 정렬된 속성도 변형 파일 이름 순서로 읽는다', () => {
    const sorted = structuredClone(manifestFixture);
    sorted.variants['style=accent,state=rest'].properties = { State: 'Rest', Style: 'Accent' };
    const manifest = parseManifest(sorted, 'export.json');
    expect(manifest.name).toBe('Button');
    expect(manifest.variants).toEqual([
      {
        variant: 'style=accent,state=hover',
        properties: [
          ['Style', 'Accent'],
          ['State', 'Hover'],
        ],
      },
      {
        variant: 'style=accent,state=rest',
        properties: [
          ['Style', 'Accent'],
          ['State', 'Rest'],
        ],
      },
    ]);
  });

  it('속성과 변형 파일 이름이 어긋나면 실패한다', () => {
    const broken = structuredClone(manifestFixture);
    broken.variants['style=accent,state=rest'].properties.State = 'Hover';
    expect(() => parseManifest(broken, 'export.json')).toThrow(/state=hover/u);
  });
});
