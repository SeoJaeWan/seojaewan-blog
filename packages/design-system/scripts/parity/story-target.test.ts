// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  isPixelComparedVariant,
  parseFigmaExport,
  pixelClip,
  variantFileName,
} from './figma-export.ts';
import {
  componentsFixture,
  settingsFixture,
  storybookIndexFixture,
} from './story-target.fixture.ts';
import { camelCase, findParityStoryId, storyArgsParam, storyTarget } from './story-target.ts';

// @codocs [[피그마 일치 검사:스토리 규칙]]
describe('스토리 규칙', () => {
  it('피그마 속성 이름은 camelCase arg 이름이 된다', () => {
    expect(camelCase('Variant')).toBe('variant');
    expect(camelCase('Show Icon')).toBe('showIcon');
  });

  it('피그마 속성 값은 이미지 파일 이름과 같은 규칙으로 정규화한 문자열이 된다', () => {
    expect(storyTarget([['Device', 'Chrome more (Mobile)']]).args).toEqual({
      device: 'chrome-more-mobile',
    });
  });

  it('True·False 값은 boolean arg가 된다', () => {
    expect(storyTarget([['Selected', 'True']]).args).toEqual({ selected: true });
    expect(storyArgsParam({ selected: true, variant: 'accent' })).toBe(
      'selected:!true;variant:accent',
    );
  });

  it('State가 Hover·Pressed·Focus면 브라우저 상호작용으로 재현하고 state arg도 넘긴다', () => {
    expect(storyTarget([['State', 'Hover']])).toEqual({
      args: { state: 'hover' },
      interaction: 'hover',
    });
    expect(storyTarget([['State', 'Pressed']]).interaction).toBe('pressed');
    expect(storyTarget([['State', 'Focus']]).interaction).toBe('focus');
  });

  it('State가 Rest·Disabled면 상호작용 없이 args로만 넘긴다', () => {
    expect(storyTarget([['State', 'Rest']]).interaction).toBe('none');
    expect(storyTarget([['State', 'Disabled']])).toEqual({
      args: { state: 'disabled' },
      interaction: 'none',
    });
  });

  it('컴포넌트 폴더의 스토리 파일에서 Parity export를 찾는다', () => {
    expect(findParityStoryId(storybookIndexFixture, 'button')).toBe('components-button--parity');
    expect(findParityStoryId(storybookIndexFixture, 'menu-item')).toBeUndefined();
  });
});

// @codocs [[저장소 구성:디자인 시스템 패키지 구조]]
describe('피그마 이미지 이름', () => {
  it('변형 파일 이름은 피그마 순서의 prop=value를 쉼표로 잇는다', () => {
    expect(
      variantFileName([
        ['Variant', 'Accent'],
        ['State', 'Rest'],
      ]),
    ).toBe('variant=accent,state=rest');
  });

  it('속성이 없는 단독 컴포넌트는 default다', () => {
    expect(variantFileName([])).toBe('default');
  });

  it('figma.json과 컴포넌트 export.json을 컴포넌트·변형 목록으로 바꾼다', () => {
    const { cases } = parseFigmaExport(settingsFixture, componentsFixture);
    expect(cases.map((item) => `${item.component}/${item.variant}`)).toEqual([
      'button/variant=accent,state=hover',
      'button/variant=accent,state=rest',
    ]);
    expect(cases[0]?.renderBounds).toEqual({ x: -2, y: -2, width: 124, height: 36 });
  });

  it('소수인 renderBounds는 왼쪽 위를 내리고 오른쪽 아래를 올려 PNG 픽셀 영역에 맞춘다', () => {
    expect(pixelClip({ x: -10.67, y: -2.5, width: 141.34, height: 37 }, 1)).toEqual({
      x: -11,
      y: -3,
      width: 142,
      height: 38,
      pixelWidth: 142,
      pixelHeight: 38,
    });
    expect(pixelClip({ x: -0.25, y: 0, width: 10.5, height: 4 }, 2)).toMatchObject({
      x: -0.5,
      width: 11,
      pixelWidth: 22,
      pixelHeight: 8,
    });
  });

  it('export.json의 속성이 이름순으로 정렬돼 있어도 변형 파일 이름의 순서(피그마 순서)로 읽는다', () => {
    const sorted = structuredClone(componentsFixture);
    sorted.button.variants['variant=accent,state=rest'].properties = {
      State: 'Rest',
      Variant: 'Accent',
    };
    const { cases } = parseFigmaExport(settingsFixture, sorted);
    expect(cases.find((item) => item.variant === 'variant=accent,state=rest')?.properties).toEqual([
      ['Variant', 'Accent'],
      ['State', 'Rest'],
    ]);
  });

  it('속성과 변형 파일 이름이 어긋나면 실패한다', () => {
    const broken = structuredClone(componentsFixture);
    broken.button.variants['variant=accent,state=rest'].properties.State = 'Hover';
    expect(() => parseFigmaExport(settingsFixture, broken)).toThrow(/state=hover/u);
  });

  it('레이어 정보가 없는 변형은 그 변형만 실패하도록 이유를 남긴다', () => {
    const old = structuredClone(componentsFixture) as Record<string, unknown>;
    const button = structuredClone(componentsFixture.button) as {
      variants: Record<string, Record<string, unknown>>;
    };
    delete button.variants['variant=accent,state=rest']?.layers;
    old.button = button;
    const { cases } = parseFigmaExport(settingsFixture, old);
    expect(cases.find((item) => item.variant === 'variant=accent,state=rest')?.layersError).toMatch(
      /레이어 정보가 없다/u,
    );
  });
});

// @codocs [[디자인 기반:재질 효과]]
describe('재질 효과', () => {
  it('재질 속성이 있는 컴포넌트는 Material=Solid 변형만 전체 이미지를 픽셀로 비교한다', () => {
    expect(isPixelComparedVariant({ properties: [['Material', 'Solid']] })).toBe(true);
    expect(isPixelComparedVariant({ properties: [['Material', 'Acrylic']] })).toBe(false);
  });

  it('재질 속성이 없는 변형은 모두 픽셀로 비교한다', () => {
    expect(
      isPixelComparedVariant({
        properties: [
          ['Style', 'Accent'],
          ['State', 'Rest'],
        ],
      }),
    ).toBe(true);
  });
});
