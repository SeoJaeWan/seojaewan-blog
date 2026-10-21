import { describe, expect, it } from 'vitest';

import { buildLayers, fontWeightOf, layerKind, vectorLayerIds } from './layer-export';
import { iconNode, labelNode, node, rootNode } from './layer-export.fixture';
import { normalizeSvgIds } from './svg-normalize';

// @codocs [[피그마 일치 검사:export.json 계약]]
describe('export.json 계약', () => {
  const layers = buildLayers(rootNode, new Map([['icon', 'f00.svg']]));

  it('보이는 레이어를 문서 순서로 담고, 숨긴 레이어는 빼고 그룹은 자식만 펼친다', () => {
    expect(layers.map((layer) => [layer.path, layer.kind])).toEqual([
      ['', 'frame'],
      ['icon', 'vector'],
      ['label', 'text'],
      ['content', 'frame'],
      ['content/label', 'text'],
      ['photo', 'image'],
      ['logo', 'frame'],
      ['mark', 'vector'],
      ['word', 'text'],
    ]);
  });

  it('위치는 변형 루트 기준이고, 루트에는 자동 배치·반경·칠·선 토큰을 담는다', () => {
    expect(layers[0]).toEqual({
      path: '',
      kind: 'frame',
      type: 'COMPONENT',
      x: 0,
      y: 0,
      width: 120,
      height: 32,
      layoutMode: 'HORIZONTAL',
      padding: { top: 6, right: 12, bottom: 6, left: 12 },
      itemSpacing: 8,
      primaryAxisAlignItems: 'CENTER',
      cornerRadius: 4,
      fills: [{ type: 'SOLID', color: '#000000', token: '{accent-fill.default}' }],
      strokes: [
        {
          type: 'GRADIENT_LINEAR',
          stops: [
            { position: 0.9067, color: '#ffffff14', token: '{control-stroke.on-accent-default}' },
            { position: 1, color: '#00000066', token: '{control-stroke.on-accent-secondary}' },
          ],
        },
      ],
      strokeWeight: 1,
      strokeAlign: 'INSIDE',
      strokeStyle: 'Elevation/Accent Control Border',
    });
  });

  it('아이콘 인스턴스는 vector 레이어 하나로 다루고 SVG 파일과 안쪽 도형의 색을 담는다', () => {
    expect(layers[1]).toEqual({
      path: 'icon',
      kind: 'vector',
      type: 'INSTANCE',
      x: 12,
      y: 8,
      width: 16,
      height: 16,
      component: 'ic_fluent_open_20_regular',
      svg: { file: 'f00.svg', x: 0, y: 0, width: 16, height: 16 },
      fills: [{ type: 'SOLID', color: '#000000e4', token: '{text-fill.primary}' }],
    });
    expect(vectorLayerIds(rootNode)).toEqual(['icon', 'mark']);
  });

  it('글자에는 글자 내용, 서체, 굵기, 크기, 줄 높이(px), 자간(px), 글자 스타일, 잉크 영역을 담는다', () => {
    expect(layers[2]?.text).toEqual({
      characters: '버튼',
      autoResize: 'WIDTH_AND_HEIGHT',
      alignHorizontal: 'LEFT',
      fontFamily: ['Pretendard'],
      fontWeight: 600,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      textStyle: ['Hangul/Body Strong'],
      ink: { x: 48.4844, y: 9.9531, width: 22.6816, height: 12.1816 },
    });
  });

  it('이미지 칠만 있는 레이어는 image이고 이미지 해시를 담는다', () => {
    expect(layers[5]?.fills).toEqual([
      { type: 'IMAGE', imageHash: 'abc', scaleMode: 'FILL', opacity: 1 },
    ]);
  });

  it('글자가 섞인 묶음은 vector가 아니고, 그 안의 도형과 글자를 따로 담는다', () => {
    expect(layerKind(node({ name: 'x', children: [iconNode, labelNode] }))).toBe('frame');
    expect(layerKind(iconNode)).toBe('vector');
  });

  it('굵기 스타일 이름을 숫자로 바꾸고, 가변 서체는 wght 값을 쓴다', () => {
    expect(fontWeightOf('Regular')).toBe(400);
    expect(fontWeightOf('Semi Bold')).toBe(600);
    expect(fontWeightOf('Bold Italic')).toBe(700);
    expect(fontWeightOf('Regular', 550)).toBe(550);
  });

  it('SVG 내부 id는 나오는 순서대로 바꿔 같은 모양이면 노드가 달라도 같은 내용이 되게 한다', () => {
    expect(normalizeSvgIds(svg('14_106'))).toBe(normalizeSvgIds(svg('14_112')));
    expect(normalizeSvgIds(svg('14_106'))).toContain('url(#s1)');
    expect(normalizeSvgIds(svg('14_106'))).toContain('id="s1"');
  });
});

/**
 * 피그마가 노드마다 다른 클립 id를 넣은 SVG를 만든다.
 * @param suffix id 뒤에 붙는 노드 ID 조각
 * @returns SVG 문자열
 */
function svg(suffix: string): string {
  return `<svg><g clip-path="url(#clip0_${suffix})"><path/></g><defs><clipPath id="clip0_${suffix}"><rect/></clipPath></defs></svg>`;
}
